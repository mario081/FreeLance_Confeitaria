import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const bcryptCompare = bcrypt.compare as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let prismaUserFindUnique: jest.Mock;
  let jwtSign: jest.Mock;

  beforeEach(async () => {
    prismaUserFindUnique = jest.fn();
    jwtSign = jest.fn().mockReturnValue('token.jwt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique: prismaUserFindUnique } },
        },
        {
          provide: JwtService,
          useValue: { sign: jwtSign },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('retorna access_token com credenciais válidas', async () => {
    prismaUserFindUnique.mockResolvedValue({
      id: 1, username: 'maria', password: 'hash', role: 'confeiteira',
    });
    bcryptCompare.mockResolvedValue(true);

    const result = await service.login('maria', 'senha123');

    expect(result).toEqual({ access_token: 'token.jwt' });
    expect(jwtSign).toHaveBeenCalledWith({ sub: 1, username: 'maria', role: 'confeiteira' });
  });

  it('lança UnauthorizedException com senha incorreta', async () => {
    prismaUserFindUnique.mockResolvedValue({
      id: 1, username: 'maria', password: 'hash', role: 'confeiteira',
    });
    bcryptCompare.mockResolvedValue(false);

    await expect(service.login('maria', 'errada')).rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException se usuário não existe', async () => {
    prismaUserFindUnique.mockResolvedValue(null);
    bcryptCompare.mockResolvedValue(false);

    await expect(service.login('naoexiste', 'qualquer')).rejects.toThrow(UnauthorizedException);
  });
});
