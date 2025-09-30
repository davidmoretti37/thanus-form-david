'use client';

import React from 'react';
import { ArcGalleryHero } from '@/components/ui/arc-gallery-hero-component';

export default function DemoOne() {
  // An array of Unsplash image URLs related to memories
  const memoryImages = [
    '/workers/celebracao-dia-trabalhador-com-um-retrato-de-desenho-animado-em-3d-de-uma-mulher-trabalhadora.jpg',
    '/workers/crianca-de-desenho-animado-posar-para-um-retrato.jpg',
    '/workers/criancas-tridimensionais-numa-aventura-para-explorar-lua-e-o-espaco.jpg',
    '/workers/homem-de-fitness-de-desenho-animado-3d (1).jpg',
    '/workers/homem-de-fitness-de-desenho-animado-3d.jpg',
    '/workers/personagem-de-desenho-animado-3d.jpg',
    '/workers/renderizacao-3d-de-astronauta (1).jpg',
    '/workers/renderizacao-3d-de-astronauta (2).jpg',
    '/workers/renderizacao-3d-de-astronauta.jpg',
    '/workers/retrato-3d-de-amigos-felizes.jpg',
    '/workers/retrato-de-duas-criancas-astronautas-em-trajes-espaciais.jpg',
    '/workers/troll-de-fantasia-em-um-ambiente-bonito.jpg',
  ];

  return (
    <div className="w-full">
      <ArcGalleryHero images={memoryImages} />
    </div>
  );
}
