import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExtractModule } from 'src/apis/extract/extract.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ExtractModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
