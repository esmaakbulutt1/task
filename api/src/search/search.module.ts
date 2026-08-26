import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProjectsSearchService } from './projects-search.service';
import { SearchDocumentService } from './search-document.service';
import { SearchIndexService } from './search-index/search-index.service';
import { SearchSyncService } from './search-sync.service';
import { TasksSearchService } from './tasks-search.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    SearchIndexService,
    SearchDocumentService,
    SearchSyncService,
    ProjectsSearchService,
    TasksSearchService,
  ],
  exports: [ProjectsSearchService, TasksSearchService],
})
export class SearchModule {}
