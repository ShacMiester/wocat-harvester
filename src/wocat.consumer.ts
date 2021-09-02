import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { DoneCallback, Job, Queue } from 'bull';
import { HttpService, Logger } from '@nestjs/common';
import { map } from 'rxjs/operators';

import moment from 'moment';
(moment as any).suppressDeprecationWarnings = true;

import { lookup, regions } from 'country-data';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Processor('fetch')
export class WocatConsumer {
  apikey: string;
  private logger = new Logger(WocatConsumer.name);
  constructor(
    private http: HttpService,
    public readonly elasticsearchService: ElasticsearchService,
  ) {}

  @Process({ name: 'wocat', concurrency: 1 })
  async fetch(job: Job, done: DoneCallback) {
    this.apikey = job.data.repo.apiKey;
    let url = '';

    job.progress(20);
    url = job.data.repo.itemsEndPoint;
    let request = await this.http
      .get(url, {
        headers: { Authorization: `Token ${this.apikey}` },
      })
      .toPromise()
      .then(result => {
        if (result?.status == 200) {
          if (result.data.next != '') {
            job.data.repo.itemsEndPoint = result.data.next;
            job.data.repo.startPage += 1;
            job.queue.add('wocat', {
              repo: job.data.repo,
            });
            done(null, result.data.next);
          } else done();
          if (result.data.results.length == 0) {
            let error = new Error('no data exist on page ' + job.data.page);
            error.name = 'NoData';
            done(error);
          } else {
            this.index(result.data.results);
            done();
          }
        } else {
          let error = new Error('something wrong happened');
          done(error);
        }
      });
  }
  async index(data: any) {
    let finalData: Array<any> = [];

    await Promise.all(
      data.map((element: any) => this.format(element.code)),
    ).then(elements => {
      elements.forEach((element: any, index) => {
        finalData.push({ index: { _index: process.env.OPENRXV_TEMP_INDEX } });
        finalData.push(element);
      });
    });
    await this.elasticsearchService
      .bulk({
        body: finalData,
      })
      .then(result => {});
  }
  async format(code: string) {
    let finalObjT: any = {};
    let jsonData: any = {};
    let url = `https://qcat.wocat.net/en/api/v2/questionnaires/${code}`;
    let request = await this.http
      .get(url, {
        headers: { Authorization: `Token ${this.apikey}` },
      })
      .pipe(
        map(d => {
          jsonData = d.data;
        }),
      )
      .toPromise();
    //  .then((result) => { jsonData = result.data})
    let finalObj: any = {};
    finalObjT['id'] = code;
    finalObjT['slm_type'] = code.split('_')[0];

    await this.traverse(jsonData, (obj: any, key: any, val: any) => {
      if (
        key == 'value' &&
        val &&
        val[0] &&
        obj.label &&
        obj.label != 'Select category(ies) / code(s)'
      ) {
        if (val[0].key && val[0].values) {
          finalObjT[val[0].key] = val[0].values;
        }

        if (Array.isArray(val)) {
          val.forEach(element => {
            if (element.key && element.value) {
              if (
                finalObjT[element.key] &&
                !Array.isArray(finalObjT[element.key])
              )
                finalObjT[element.key] = [finalObjT[element.key]];
              if (Array.isArray(finalObjT[element.key])) {
                if (
                  finalObjT[element.key].indexOf(element.value) === -1 &&
                  element.value
                )
                  finalObjT[element.key].push(element.value);
              } else finalObjT[element.key] = element.value;
            }
          });
        }
      }
      if (obj.hasOwnProperty('image'))
        if (obj.image.hasOwnProperty('value'))
          if (Array.isArray(obj.image.value)) {
            finalObjT['thumbnail'] =
              'https://qcat.wocat.net' + obj.image.value[0].value;
          }
      if (
        key == 'value' &&
        val &&
        val[0] &&
        obj.label &&
        obj.label == 'Select category(ies) / code(s)'
      ) {
        if (val[0].key && val[0].values && !finalObjT['clean_' + val[0].key]) {
          finalObjT['clean_' + val[0].key] = val[0].values;
        } else if (
          val[0].key &&
          val[0].values &&
          finalObjT['clean_' + val[0].key]
        )
          finalObjT['clean_' + val[0].key] = [
            ...finalObjT['clean_' + val[0].key],
            ...val[0].values,
          ];
      }

      if (key == 'user_id' && val && val.value) {
        finalObjT['SLM specialist'] = [];
        val.value.forEach((element: any) => {
          if (element.value) finalObjT['SLM specialist'].push(element.value);
        });
      }
      if (key == 'location_map') {
        finalObjT['map_points'] = [];
        if (val.value[0] && val.value[0].value)
          JSON.parse(val.value[0].value).features.forEach((element: any) => {
            finalObjT['map_points'].push(
              element.geometry.coordinates[0] +
                ',' +
                element.geometry.coordinates[1] +
                ',' +
                finalObjT.id +
                ',' +
                finalObjT !=
                undefined
                ? finalObjT.Name != undefined
                  ? finalObjT.Name.replace(',', '')
                  : ''
                : null,
            );
          });
      }
      if (key == 'date_documentation') {
        if (val.value && val.value[0] && val.value[0].value)
          if (moment(val.value[0].value).isValid())
            finalObjT['date_documentation'] = moment(val.value[0].value).format(
              'YYYY-MM-DD',
            );
      }
      if (key == 'qg_location') {
        finalObjT['Country'] = [];
        finalObjT['regions'] = [];

        val.children.country.value.forEach((element: any) => {
          finalObjT['Country'].push(element.value);
        });
        let countries = finalObjT['Country'].filter(
          (element: any) => finalObjT['Country'].indexOf(element) != -1,
        );
        countries.forEach((country: string) => {
          let result = lookup.countries({ name: country })[0];
          if (result && result.alpha2) {
            let region: any = Object.values(regions).filter(
              (regions: any) => regions.countries.indexOf(result.alpha2) >= 0,
            )[0];
            finalObjT['regions'].push(region.name);
          } else {
          }
        });
      }
    });
    if (
      finalObjT['slm_type'] != 'approaches' &&
      finalObjT['First name(s)'] &&
      finalObjT['Lastname / surname']
    )
      finalObjT['SLM specialist'].push(
        finalObjT['First name(s)'] + finalObjT['Lastname / surname'],
      );

    if (finalObjT['Land use type'])
      finalObjT['Land use type'] = finalObjT['Land use type'].map(
        (element: any) => element[0],
      );
    if (finalObjT['SLM measures'])
      finalObjT['SLM measures'] = finalObjT['SLM measures'].map(
        (element: any) => element[0],
      );

    if (finalObjT['Degradation type'])
      finalObjT['Degradation type'] = finalObjT['Degradation type'].map(
        (element: any) => element[0],
      );

    return finalObjT;
  }

  async traverse(o: any, fn: (obj: any, prop: string, value: any) => void) {
    for (const i in o) {
      fn.apply(this, [o, i, o[i]]);
      if (o[i] !== null && typeof o[i] === 'object') {
        this.traverse(o[i], fn);
      }
    }
  }
}
