import { Test, TestingModule } from '@nestjs/testing';
import { NfceService } from './nfce.service';

describe('NfceService', () => {
  let service: NfceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NfceService],
    }).compile();

    service = module.get<NfceService>(NfceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
