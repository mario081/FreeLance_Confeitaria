import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CriarPedidoDto } from './dto';

function dto(overrides: Partial<Record<string, unknown>> = {}) {
  return plainToInstance(CriarPedidoDto, {
    nomeCliente: 'Ana Silva',
    saborBolo: 'Chocolate',
    dataEntrega: '2099-12-25',
    possui_personalizados: false,
    ...overrides,
  });
}

describe('CriarPedidoDto', () => {
  it('aceita DTO válido', async () => {
    const errors = await validate(dto());
    expect(errors).toHaveLength(0);
  });

  it('rejeita dataEntrega no passado', async () => {
    const errors = await validate(dto({ dataEntrega: '2000-01-01' }));
    expect(errors.some((e) => e.property === 'dataEntrega')).toBe(true);
  });

  it('rejeita nomeCliente com menos de 2 caracteres', async () => {
    const errors = await validate(dto({ nomeCliente: 'A' }));
    expect(errors.some((e) => e.property === 'nomeCliente')).toBe(true);
  });

  it('rejeita nomeCliente com mais de 120 caracteres', async () => {
    const errors = await validate(dto({ nomeCliente: 'A'.repeat(121) }));
    expect(errors.some((e) => e.property === 'nomeCliente')).toBe(true);
  });

  it('rejeita saborBolo com menos de 2 caracteres', async () => {
    const errors = await validate(dto({ saborBolo: 'X' }));
    expect(errors.some((e) => e.property === 'saborBolo')).toBe(true);
  });

  it('rejeita possui_personalizados que não é boolean', async () => {
    const errors = await validate(dto({ possui_personalizados: 'sim' }));
    expect(errors.some((e) => e.property === 'possui_personalizados')).toBe(true);
  });
});
