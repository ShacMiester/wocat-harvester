# WOCAT Harvester

This package is concerned with fetching/harvesting **WOCAT** data for the [WOCAT Dashboard](https://explorer.wocat.net/).

# Usage

1. Cloning the repo
```
git clone https://github.com/ShacMiester/wocat-harvester
```
1. Adding it to your dependencies.
Specifying dependencies and devDependencies in a package.json file
```
"wocat-wocat-harvestor": "file: {your filePath} ",
```
Or you can just install it directly
```
npm i --save {filepath}
```
1. Importing WocatHarvestModule inside the HarvesterModule.
```
import { WocatHarvestModule } from "wocat-wocat-harvestor";

imports: [
    .
    .
    .
    WocatHarvestModule
  ],
```




