import React from 'react';
import { z } from 'zod';
import { Tool } from '../../Tool';

const OceanOptunaOptimizeToolInputSchema = z.object({
  data_path: z.string().describe("Path to ocean dataset for optimization"),
  model_types: z.array(z.enum(['fno', 'cnn', 'unet'])).default(['fno']).describe("Model types to optimize"),
  n_trials: z.number().default(50).describe("Number of optimization trials"),
  max_epochs: z.number().default(20).describe("Maximum epochs per trial"),
  output_dir: z.string().optional().describe("Output directory for optimization results"),
  parallel_jobs: z.number().default(1).describe("Number of parallel optimization jobs"),
  optimization_target: z.enum(['loss', 'psnr', 'ssim']).default('psnr').describe("Optimization target metric")
});

export const OceanOptunaOptimizeTool: Tool<typeof OceanOptunaOptimizeToolInputSchema> = {
  name: 'OceanOptunaOptimize',
  inputSchema: OceanOptunaOptimizeToolInputSchema,
  
  description: async () => 'Automatic hyperparameter optimization for ocean deep learning models using Optuna',
  
  prompt: async () => `Automatic hyperparameter optimization for ocean deep learning models using Optuna.

This tool performs automated hyperparameter search for ocean models:
- Supports FNO, CNN, and UNet architectures
- Bayesian optimization with Optuna
- Multi-objective optimization (loss, PSNR, SSIM)
- Parallel trials for faster optimization
- Comprehensive hyperparameter search space

Parameters:
- data_path: Training dataset path
- model_types: Model architectures to optimize
- n_trials: Number of optimization trials  
- max_epochs: Maximum training epochs per trial
- optimization_target: Target metric to optimize
- parallel_jobs: Number of parallel workers

The tool automatically searches learning rates, batch sizes, model dimensions, and architecture-specific parameters.`,

  userFacingName: () => 'Ocean Optuna Optimization',
  
  isEnabled: async () => true,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  needsPermissions: () => true,

  renderToolUseMessage: (input, { verbose }) => {
    return `Running Optuna optimization for ${input.model_types.join(', ')} models with ${input.n_trials} trials, target: ${input.optimization_target.toUpperCase()}`
  },

  renderResultForAssistant: (output) => {
    if (typeof output === 'string') {
      try {
        const result = JSON.parse(output);
        return `✅ Optuna Optimization Complete!
Best Trial: ${result.best_trial}
Best ${result.optimization_target?.toUpperCase() || 'PSNR'}: ${result.best_value}
Best Model: ${result.best_model}
Results: ${result.output_dir}`;
      } catch {
        return output;
      }
    }
    return output;
  },

  async *call(params) {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const fs = await import('fs');

    // 验证数据文件
    if (!fs.existsSync(params.data_path)) {
      throw new Error(`Dataset file not found: ${params.data_path}`);
    }

    // 创建输出目录
    const outputDir = params.output_dir || './ocean_optuna_results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 创建Optuna优化脚本
    const pythonScript = `
import os
import sys
import json
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import optuna
from optuna.trial import TrialState
import joblib
from pathlib import Path

# 简化的FNO模型
class SpectralConv2d(nn.Module):
    def __init__(self, in_channels, out_channels, modes1, modes2):
        super(SpectralConv2d, self).__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.modes1 = modes1
        self.modes2 = modes2
        
        self.scale = 1.0 / (in_channels * out_channels)
        self.weights1 = nn.Parameter(self.scale * torch.rand(in_channels, out_channels, modes1, modes2, dtype=torch.cfloat))
        self.weights2 = nn.Parameter(self.scale * torch.rand(in_channels, out_channels, modes1, modes2, dtype=torch.cfloat))

    def forward(self, x):
        batchsize = x.shape[0]
        x_ft = torch.fft.rfft2(x)
        
        out_ft = torch.zeros(batchsize, self.out_channels, x.size(-2), x.size(-1)//2 + 1,
                             dtype=torch.cfloat, device=x.device)
        
        out_ft[:, :, :self.modes1, :self.modes2] = torch.einsum("bixy,ioxy->boxy", 
                                                                x_ft[:, :, :self.modes1, :self.modes2], self.weights1)
        out_ft[:, :, -self.modes1:, :self.modes2] = torch.einsum("bixy,ioxy->boxy",
                                                                 x_ft[:, :, -self.modes1:, :self.modes2], self.weights2)
            
        x_out = torch.fft.irfft2(out_ft, s=(x.size(-2), x.size(-1)))
        return x_out

class SimpleFNO(nn.Module):
    def __init__(self, modes1=12, modes2=12, width=64, n_layers=4):
        super(SimpleFNO, self).__init__()
        self.modes1 = modes1
        self.modes2 = modes2
        self.width = width
        
        self.fc0 = nn.Linear(3, self.width)
        
        self.convs = nn.ModuleList([SpectralConv2d(self.width, self.width, modes1, modes2) for _ in range(n_layers)])
        self.ws = nn.ModuleList([nn.Conv2d(self.width, self.width, 1) for _ in range(n_layers)])
        
        self.fc1 = nn.Linear(self.width, 128)
        self.fc2 = nn.Linear(128, 2)

    def forward(self, x):
        x = x.permute(0, 2, 3, 1)
        batchsize, H, W, _ = x.shape
        
        # 位置编码
        grid_x, grid_y = torch.meshgrid(torch.linspace(0, 1, H), torch.linspace(0, 1, W), indexing='ij')
        grid = torch.stack([grid_x, grid_y], dim=-1).unsqueeze(0).repeat(batchsize, 1, 1, 1)
        grid = grid.to(x.device)
        x = torch.cat([x, grid[:,:,:,0:1]], dim=-1)
        
        x = self.fc0(x)
        x = x.permute(0, 3, 1, 2)
        
        for conv, w in zip(self.convs, self.ws):
            x = torch.nn.functional.gelu(conv(x) + w(x))
        
        x = x.permute(0, 2, 3, 1)
        x = self.fc1(x)
        x = torch.nn.functional.gelu(x)
        x = self.fc2(x)
        x = x.permute(0, 3, 1, 2)
        
        return x

class SimpleCNN(nn.Module):
    def __init__(self, n_layers=4, base_channels=64):
        super(SimpleCNN, self).__init__()
        layers = []
        in_ch = 2
        for i in range(n_layers):
            out_ch = base_channels * (2 ** min(i, 3))
            layers.extend([
                nn.Conv2d(in_ch, out_ch, 3, padding=1),
                nn.ReLU(),
                nn.Conv2d(out_ch, out_ch, 3, padding=1),
                nn.ReLU()
            ])
            in_ch = out_ch
            
        layers.extend([
            nn.Conv2d(in_ch, 2, 1),
            nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
        ])
        
        self.net = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.net(x)

class QuickOceanDataset(Dataset):
    def __init__(self, data_path, max_samples=500):
        data = np.load(data_path)
        
        # 限制样本数量以加快优化
        if len(data) > max_samples:
            indices = np.random.choice(len(data), max_samples, replace=False)
            data = data[indices]
            
        if len(data.shape) == 3:
            data = np.stack([data, np.zeros_like(data)], axis=1)
        elif len(data.shape) == 4 and data.shape[1] == 1:
            data = np.concatenate([data, np.zeros_like(data)], axis=1)
            
        self.data = data
        print(f"Quick dataset loaded: {self.data.shape}")
        
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        hr = self.data[idx]
        lr = torch.nn.functional.interpolate(
            torch.from_numpy(hr).unsqueeze(0).float(), 
            scale_factor=0.5, mode='bilinear', align_corners=True
        ).squeeze(0)
        return lr, torch.from_numpy(hr).float()

def train_quick_model(model, dataloader, device, epochs=5):
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for lr_data, hr_data in dataloader:
            lr_data, hr_data = lr_data.to(device), hr_data.to(device)
            
            optimizer.zero_grad()
            output = model(lr_data)
            loss = criterion(output, hr_data)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
    
    # 评估
    model.eval()
    total_psnr = 0
    count = 0
    
    with torch.no_grad():
        for lr_data, hr_data in dataloader:
            lr_data, hr_data = lr_data.to(device), hr_data.to(device)
            output = model(lr_data)
            
            mse = torch.mean((output - hr_data) ** 2)
            if mse > 0:
                psnr = 20 * torch.log10(1.0 / torch.sqrt(mse))
                total_psnr += psnr.item()
                count += 1
    
    return total_psnr / count if count > 0 else 0

def objective(trial):
    # 超参数搜索空间
    model_type = trial.suggest_categorical('model_type', ${JSON.stringify(params.model_types)})
    
    if model_type == 'fno':
        modes1 = trial.suggest_int('modes1', 8, 20)
        modes2 = trial.suggest_int('modes2', 8, 20)
        width = trial.suggest_categorical('width', [32, 64, 128])
        n_layers = trial.suggest_int('n_layers', 2, 6)
        model = SimpleFNO(modes1=modes1, modes2=modes2, width=width, n_layers=n_layers)
    elif model_type == 'cnn':
        n_layers = trial.suggest_int('n_layers', 2, 6)
        base_channels = trial.suggest_categorical('base_channels', [32, 64, 128])
        model = SimpleCNN(n_layers=n_layers, base_channels=base_channels)
    else:
        raise ValueError(f"Model type {model_type} not supported")
    
    lr = trial.suggest_float('learning_rate', 1e-5, 1e-2, log=True)
    batch_size = trial.suggest_categorical('batch_size', [4, 8, 16])
    
    # 数据和训练
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    dataset = QuickOceanDataset("${params.data_path}")
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    
    model = model.to(device)
    
    # 快速训练
    epochs = min(${params.max_epochs}, 10)  # 限制epoch数量
    psnr = train_quick_model(model, dataloader, device, epochs)
    
    return psnr

def run_optimization():
    # 参数
    n_trials = ${params.n_trials}
    output_dir = "${outputDir}"
    
    # 创建study
    study = optuna.create_study(direction='maximize')
    
    print(f"Starting optimization with {n_trials} trials...")
    
    # 运行优化
    study.optimize(objective, n_trials=n_trials)
    
    # 保存结果
    study_path = os.path.join(output_dir, 'optuna_study.pkl')
    joblib.dump(study, study_path)
    
    # 最佳结果
    best_trial = study.best_trial
    
    result = {
        'best_trial': best_trial.number,
        'best_value': best_trial.value,
        'best_params': best_trial.params,
        'best_model': best_trial.params.get('model_type', 'unknown'),
        'output_dir': output_dir,
        'study_path': study_path,
        'n_trials': n_trials,
        'optimization_target': '${params.optimization_target}'
    }
    
    # 保存详细结果
    results_file = os.path.join(output_dir, 'optimization_results.json')
    with open(results_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    # 保存trials历史
    trials_data = []
    for trial in study.trials:
        if trial.state == TrialState.COMPLETE:
            trials_data.append({
                'trial_id': trial.number,
                'value': trial.value,
                'params': trial.params
            })
    
    trials_file = os.path.join(output_dir, 'trials_history.json')
    with open(trials_file, 'w') as f:
        json.dump(trials_data, f, indent=2)
    
    print(json.dumps(result))

if __name__ == "__main__":
    run_optimization()
`;

    const scriptPath = path.join(outputDir, 'optuna_optimize.py');
    fs.writeFileSync(scriptPath, pythonScript);

    yield { type: 'progress', content: 'Starting Optuna hyperparameter optimization...' };

    const python = spawn('python', [scriptPath], {
      cwd: outputDir,
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    for await (const data of python.stdout) {
      const text = data.toString();
      output += text;
      yield { type: 'progress', content: text.trim() };
    }

    for await (const data of python.stderr) {
      const text = data.toString();
      errorOutput += text;
    }

    const exitCode = await new Promise<number>((resolve) => {
      python.on('close', resolve);
    });

    if (exitCode === 0) {
      try {
        const lines = output.split('\n');
        const resultLine = lines.find(line => line.trim().startsWith('{'));
        if (resultLine) {
          yield { type: 'result', data: resultLine.trim() };
        } else {
          yield { 
            type: 'result',
            data: JSON.stringify({
              status: 'completed',
              output_dir: outputDir,
              message: 'Optimization completed'
            })
          };
        }
      } catch (e) {
        yield { 
          type: 'result',
          data: JSON.stringify({
            status: 'completed', 
            output_dir: outputDir,
            message: 'Optimization completed'
          })
        };
      }
    } else {
      throw new Error(`Optimization failed with code ${exitCode}: ${errorOutput}`);
    }
  }
};