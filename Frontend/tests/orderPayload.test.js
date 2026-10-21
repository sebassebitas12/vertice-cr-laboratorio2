import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeOrderPayload } from '../src/services/orderPayload.js';

test('los IDs BIGINT serializados como texto se envían como números', () => {
  assert.deepEqual(makeOrderPayload('1', [{ id: '13', quantity: 2 }], ' bienvenida10 '), {
    cliente_id: 1, items: [{ producto_id: 13, cantidad: 2 }], cupon_codigo: 'BIENVENIDA10',
  });
});
test('una orden sin cupón no envía un código vacío', () => {
  assert.equal('cupon_codigo' in makeOrderPayload('1', [{ id: '13', quantity: 1 }]), false);
});
test('rechaza identificadores inseguros y cantidades inválidas antes de enviar', () => {
  for (const item of [{ id: '9007199254740993', quantity: 1 }, { id: '13', quantity: 0 }, { id: '13', quantity: 1.5 }]) {
    assert.throws(() => makeOrderPayload('1', [item]));
  }
  assert.throws(() => makeOrderPayload('', [{ id: '13', quantity: 1 }]));
  assert.throws(() => makeOrderPayload('1', []));
});
