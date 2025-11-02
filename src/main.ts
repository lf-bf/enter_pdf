import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

const prefix = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
		logger: ['log', 'error', 'warn'],
		cors: true,
	});

  app.setGlobalPrefix(prefix);

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
