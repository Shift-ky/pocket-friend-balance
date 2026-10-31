import { createFileRoute } from '@tanstack/react-router';
import { WalletsPage } from '@/components/wallets-page';
export const Route=createFileRoute('/carteiras')({head:()=>({meta:[{title:'MarIA — Carteiras'},{name:'description',content:'Gerencie contas, benefícios, reservas e carteiras internacionais.'},{property:'og:title',content:'MarIA — Carteiras'},{property:'og:description',content:'Saldos reais, moedas e preferências de cada carteira.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:WalletsPage});
