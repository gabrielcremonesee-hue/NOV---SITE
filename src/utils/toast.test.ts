import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearToasts,
  dismissToast,
  getToasts,
  pushToast,
  subscribeToasts,
  toast,
} from './toast';

test('toast helpers push, notify subscribers, dismiss, and clear cleanly', () => {
  clearToasts();
  const snapshots: number[] = [];
  const unsubscribe = subscribeToasts((items) => {
    snapshots.push(items.length);
  });

  const item = toast.success('Cadastro realizado!', 'Sua conta foi sincronizada.');
  assert.equal(item.variant, 'success');
  assert.equal(item.title, 'Cadastro realizado!');
  assert.equal(item.description, 'Sua conta foi sincronizada.');
  assert.equal(getToasts().length, 1);

  const errItem = toast.error('Erro no envio');
  assert.equal(errItem.variant, 'error');
  assert.equal(errItem.durationMs, 6000);
  assert.equal(getToasts().length, 2);

  assert.equal(dismissToast(item.id), true);
  assert.equal(dismissToast('non-existent'), false);
  assert.equal(getToasts().length, 1);

  clearToasts();
  assert.equal(getToasts().length, 0);
  unsubscribe();
  assert.deepEqual(snapshots, [0, 1, 2, 1, 0]);
});

test('pushToast caps queue to 4 visible notifications', () => {
  clearToasts();
  for (let i = 1; i <= 6; i++) {
    pushToast({ title: `Notificação ${i}`, variant: 'info' });
  }
  const active = getToasts();
  assert.equal(active.length, 4);
  assert.equal(active[0].title, 'Notificação 3');
  assert.equal(active[3].title, 'Notificação 6');
  clearToasts();
});
