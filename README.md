# WOCAT Harvester

This package is concerned with fetching/harvesting **WOCAT** data for the [OpenRXV Dashboard](https://cgspace.cgiar.org/explorer/).

# Usage

1. Cloning the repo
```
git clone https://github.com/ShacMiester/wocat-harvester
```
2. Adding it to your dependencies.
Specifying dependencies and devDependencies in a package.json file
```
"wocat-wocat-harvestor": "file: {Package file path} ",
```
Or you can just install it directly
```
npm i --save {filepath}
```
3. Importing WocatHarvestModule inside the HarvesterModule.
```
import { WocatHarvestModule } from "wocat-wocat-harvestor";

imports: [
    .
    .
    .
    WocatHarvestModule
  ],
```




