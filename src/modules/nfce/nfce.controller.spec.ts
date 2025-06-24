import { Test, TestingModule } from '@nestjs/testing';
import { NfceController } from './nfce.controller';

describe('NfceController', () => {
  let controller: NfceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NfceController],
    }).compile();

    controller = module.get<NfceController>(NfceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
