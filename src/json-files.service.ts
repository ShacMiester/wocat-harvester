import { Injectable } from '@nestjs/common';
import * as jsonfile from 'jsonfile';
import { join } from 'path';
import * as fs from 'fs';
import { readdirSync, copyFileSync, existsSync, mkdirSync } from 'fs';

@Injectable()
export class JsonFilesService {
  async startup() {
    let files = await readdirSync(join(__dirname, '../../../data/templates'));
    for (let file of files)
      if (
        !(await existsSync(join(__dirname, '../../../data/' + file.substr(6))))
      )
        await copyFileSync(
          join(__dirname, '../../../data/templates/' + file),
          join(__dirname, '../../../data/' + file.substr(6)),
        );

    if (await existsSync(join(__dirname, '../../../data/files/images')))
      await mkdirSync(join(__dirname, '../../../data/files/images'), {
        recursive: true,
      });
  }

  async createifnotexist() {
    const directory = join(__dirname, '../../../data/harvestors');
    if (!(await existsSync(directory)))
      await mkdirSync(directory, {
        recursive: true,
      });

    fs.readdir(directory, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(join(directory, file), err => {
          if (err) throw err;
        });
      }
    });
  }

  async save(obj: any, name: string) {
    jsonfile.writeFileSync(join(__dirname, name), obj);
    return { success: true };
  }

  async read(name: string) {
    return jsonfile.readFileSync(join(__dirname, name));
  }
  async metaData(name: string) {
    return jsonfile.readFile(join(__dirname, `../data/${name}.json`));
  }
}
