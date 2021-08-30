import { BullModule } from '@nestjs/bull';
import { HttpModule, Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { JsonFilesService } from './json-files.service';
import { WocatConsumer } from './wocat.consumer';
import { WocatController } from './wocat.controller';
console.log('module ');
@Module({
  providers: [WocatConsumer, JsonFilesService],
  exports: [],
  imports: [
    HttpModule,
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_HOST,
    }),
  ],
  controllers: [WocatController],
})
export class WocatHarvestModule {
  constructor(private jsonService: JsonFilesService) {
    this.init();
  }

  async init() {
    setTimeout(async () => {
      await this.jsonService.save(
        { name: 'Wocat' },
        '../../backend/data/harvestors/wocat.json',
      );
    }, 500);
  }
}
