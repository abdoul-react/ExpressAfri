import helmet from 'helmet'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }))

  // 64 Mo : un produit peut porter jusqu'à 8 photos en base64 (5 Mo × 1,33 d'encodage)
  app.useBodyParser('json', { limit: '64mb' })
  app.useBodyParser('urlencoded', { limit: '64mb', extended: true })

  // process.cwd() (et non __dirname) : multer écrit dans <cwd>/uploads ;
  // __dirname pointe vers dist/src en exécution compilée → 404 sur toutes les images
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })

  app.setGlobalPrefix('api')
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  app.enableCors({ origin: corsOrigins, methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true })
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  const config = new DocumentBuilder()
    .setTitle('ExpressAfri API')
    .setDescription('API backend pour la plateforme e-commerce ExpressAfri')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}`)
  console.log(`Swagger docs on http://localhost:${port}/docs`)
}
bootstrap()
