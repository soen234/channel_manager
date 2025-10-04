import cron from 'node-cron';
import { SyncService } from './sync.service';
import { logger } from '../utils/logger';

export class SyncScheduler {
  private syncService: SyncService;
  private syncInterval: string;

  constructor() {
    this.syncService = new SyncService();
    // 환경변수에서 동기화 주기 읽기 (기본: 5분마다)
    const intervalMinutes = process.env.SYNC_INTERVAL_MINUTES || '5';
    this.syncInterval = `*/${intervalMinutes} * * * *`;
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    logger.info(`Starting sync scheduler with interval: ${this.syncInterval}`);

    // 정기 동기화 스케줄
    cron.schedule(this.syncInterval, async () => {
      try {
        logger.info('Running scheduled sync...');
        await this.syncService.fullSync();
      } catch (error) {
        logger.error(`Scheduled sync failed: ${error}`);
      }
    });

    // 매일 새벽 3시에 전체 동기화
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Running daily full sync...');
        await this.syncService.fullSync();
      } catch (error) {
        logger.error(`Daily sync failed: ${error}`);
      }
    });

    logger.info('Sync scheduler started successfully');
  }

  /**
   * 수동 동기화 트리거
   */
  async triggerManualSync(): Promise<void> {
    logger.info('Manual sync triggered');
    await this.syncService.fullSync();
  }
}
