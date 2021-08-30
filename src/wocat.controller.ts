import { Controller, Get, HttpService, Query } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { JsonFilesService } from './json-files.service';

@Controller('settings')
export class WocatController {
  constructor(
    private readonly httpService: HttpService,
    private readonly jsonService: JsonFilesService,
  ) {}

  apikey: string = '2176c299d31d4f9edfa2540ce7164221858394b8';

  @Get('wocat/autometa')
  async AutoMeta(@Query('link') link: string) {
    let metaData: any;
    await this.jsonService.metaData('wocat').then(data => {
      metaData = data;
    });

    let checkingVersion = this.httpService
      .get(new URL(link).origin + '')
      .pipe(
        map(async (response, index) => {
          if (response.data.apiVersion == undefined) {
            let data = await this.httpService
              .get(link + '', {
                headers: { Authorization: `Token ${this.apikey}` },
              })
              .pipe(
                map(
                  (data: any) => {
                    let merged = {
                      base: [],
                      metadata: [],
                    };
                    data = data.data.results.forEach(element => {
                      console.log(element);
                      merged.base = Array.from(
                        new Set(
                          [].concat.apply(
                            merged.base,
                            Object.keys(element).filter(
                              d =>
                                ['metadata', 'bitstreams', 'expand'].indexOf(
                                  d,
                                ) == -1,
                            ),
                          ),
                        ),
                      );
                      merged.metadata = metaData.metadata;
                    });
                    return merged;
                  },
                  error => {},
                ),
              )
              .toPromise();

            return data;
          }
        }),
      )
      .toPromise();
    return checkingVersion;
  }
}
