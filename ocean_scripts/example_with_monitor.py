"""
Example: Simple RNN Training with kode_ocean DashboardMonitor

This demonstrates how easy Dashboard integration is with the kode_ocean package.
Only 5-10 lines of dashboard code needed!

Before running:
    conda activate agentUse
    cd Kode-Ocean/ocean_scripts
    pip install -e .

Then run:
    conda run -n agentUse python example_with_monitor.py
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np

# 🚀 NEW: Import kode_ocean package (auto-installed with pip install -e .)
from kode_ocean import DashboardMonitor


# Simple RNN model
class SimpleRNN(nn.Module):
    def __init__(self, input_size=32*32, hidden_size=128, output_size=32*32):
        super(SimpleRNN, self).__init__()
        self.hidden_size = hidden_size
        self.rnn = nn.LSTM(input_size, hidden_size, num_layers=2, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        batch_size = x.size(0)
        x = x.view(batch_size, 1, -1)
        out, _ = self.rnn(x)
        out = self.fc(out[:, -1, :])
        out = out.view(batch_size, 1, 32, 32)
        return out


# Simple dummy dataset
class DummyDataset(Dataset):
    def __init__(self, size=100):
        self.size = size

    def __len__(self):
        return self.size

    def __getitem__(self, idx):
        lr_data = np.random.randn(1, 32, 32).astype(np.float32)
        hr_data = lr_data + np.random.randn(1, 32, 32).astype(np.float32) * 0.1
        return torch.from_numpy(lr_data), torch.from_numpy(hr_data)


def main():
    print("=== Example: Training with kode_ocean DashboardMonitor ===")

    # 🌊 DASHBOARD INTEGRATION - ONLY 5-10 LINES NEEDED! 🌊
    with DashboardMonitor(url="http://localhost:3737", clear_old_data=True) as monitor:

        # Prepare data
        dataset = DummyDataset(size=100)
        train_size = int(0.8 * len(dataset))
        test_size = len(dataset) - train_size
        train_dataset, test_dataset = torch.utils.data.random_split(dataset, [train_size, test_size])

        train_loader = DataLoader(train_dataset, batch_size=4, shuffle=True)
        test_loader = DataLoader(test_dataset, batch_size=4, shuffle=False)

        # Create model and move to GPU (auto-detected by monitor)
        model = SimpleRNN().to(monitor.device)
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        # 🚀 Register model with Dashboard (auto-extracts layer info!)
        monitor.register_model(
            model,
            name="Simple LSTM RNN",
            params={
                "learning_rate": 0.001,
                "batch_size": 4,
                "optimizer": "Adam"
            }
        )

        # 🚀 Start training
        num_epochs = 20
        monitor.start_training(num_epochs)

        # Training loop
        for epoch in range(num_epochs):
            # Train
            model.train()
            train_loss = 0.0
            for lr, hr in train_loader:
                lr, hr = lr.to(monitor.device), hr.to(monitor.device)

                optimizer.zero_grad()
                output = model(lr)
                loss = criterion(output, hr)
                loss.backward()
                optimizer.step()

                train_loss += loss.item()

            train_loss /= len(train_loader)

            # Test
            model.eval()
            test_loss = 0.0
            with torch.no_grad():
                for lr, hr in test_loader:
                    lr, hr = lr.to(monitor.device), hr.to(monitor.device)
                    output = model(lr)
                    loss = criterion(output, hr)
                    test_loss += loss.item()

            test_loss /= len(test_loader) if len(test_loader) > 0 else 1

            # 🚀 Log epoch to Dashboard (auto-updates everything!)
            monitor.log_epoch(
                epoch=epoch + 1,
                loss=train_loss,
                metrics={
                    "train_loss": train_loss,
                    "test_loss": test_loss
                }
            )

            print(f"Epoch [{epoch+1}/{num_epochs}] - Train: {train_loss:.6f}, Test: {test_loss:.6f}")

        # Optional: Add custom visualization
        # monitor.add_visualization("My Plot", "/outputs/plot.png", "training_curve")

        # 🚀 Dashboard auto-completes training on exit!

    print("=== Training Complete ===")
    print("✅ Dashboard automatically:")
    print("   - Cleared old data")
    print("   - Detected GPU")
    print("   - Extracted model layers")
    print("   - Updated training status")
    print("   - Monitored GPU memory")
    print("   - Marked training as completed")


if __name__ == "__main__":
    main()
