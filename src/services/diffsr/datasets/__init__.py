from .ns2d import NavierStokes2DDataset
from .ERA5 import ERA5Dataset
from .Ocean import OceanDataset
from .ERA5wind import ERA5WindDataset
from .ERA5temperature import ERA5TemperatureDataset

_dataset_dict = {
    "NavierStokes2D": NavierStokes2DDataset,
    "ERA5": ERA5Dataset,
    "ERA5wind": ERA5WindDataset,
    "ERA5temperature": ERA5TemperatureDataset,
    "Ocean": OceanDataset,
}
