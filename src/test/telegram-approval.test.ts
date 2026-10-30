import {describe,it,expect} from 'vitest';
import {receiptInput,telegramActions,normalizeExtracted} from '@/lib/telegram/model';
const id='00000000-0000-4000-8000-000000000001';
const row={id,documento:'comprovante',produtos:[],valor:38.97,data:'2026-10-29',descricao:'Pix'};
const receipt={id,action:'aprovar',valor:38.97,data:'2026-10-29',descricao:'Compra',local:'Mercado',conta:'alimentacao',categoria:'Mercado',produtos:[{nome:'ARROZ MARCA X',qtd:2,preco:10,estoque_id:null,novo:false,nome_estoque:''}]};
describe('Aprovação Telegram e cupons',()=>{
 it('oferece as três carteiras e Moto apenas quando permitido',()=>{
   const actions=telegramActions(row,true,'2026-10-30').flat().map(b=>'callback_data' in b ? b.callback_data : '');
   expect(actions).toContain(`dinheiro:${id}`);expect(actions).toContain(`alimentacao:${id}`);expect(actions).toContain(`refeicao:${id}`);expect(actions).toContain(`moto:${id}`);
   expect(telegramActions(row,false,'2026-10-30').flat().some(b=>'callback_data' in b&&b.callback_data===`moto:${id}`)).toBe(false);
 });
 it('boleto futuro oferece somente salvar pendência e descarte',()=>{
   expect(telegramActions({...row,documento:'boleto',data:'2026-11-10'},true,'2026-10-30').flat().filter(b=>'callback_data' in b).map(b=>'callback_data' in b?b.callback_data:'')).toEqual([`pendencia:${id}`,`descartar:${id}`]);
 });
 it('cupons com produtos não permitem aprovação fora do app',()=>{
   for(const document of [{...row,documento:'cupom'},{...row,produtos:[{nome:'Arroz',qtd:2}]}]) expect(telegramActions(document,true,'2026-10-30').flat().filter(b=>'callback_data' in b).map(b=>'callback_data' in b?b.callback_data:'')).toEqual([`descartar:${id}`]);
 });
 it('item sem associação e sem novo permanece na compra',()=>{expect(receiptInput.parse(receipt).produtos[0]?.novo).toBe(false);expect(receiptInput.parse(receipt).produtos).toHaveLength(1);});
 it('não aprova preço ou quantidade ilegível',()=>{
   for(const patch of [{qtd:null},{preco:null}]) expect(receiptInput.safeParse({...receipt,produtos:[{...receipt.produtos[0],...patch}]}).success).toBe(false);
 });
 it('impede associação e novo produto simultâneos',()=>{expect(receiptInput.safeParse({...receipt,produtos:[{...receipt.produtos[0],estoque_id:id,novo:true,nome_estoque:'Arroz'}]}).success).toBe(false);});
 it('preserva preço pago e quantidade fracionária extraídos',()=>{
   const result=normalizeExtracted({valor:7.5,data:'2026-10-29',emissao:null,beneficiario:'Mercado',descricao:'Cupom',documento:'cupom',codigo:null,produtos:[{nome:'Banana',qtd:0.75,preco:10}]});
   expect(result.produtos).toEqual([{nome:'Banana',qtd:0.75,preco:10}]);
 });
});