'use client';

import { useState, useMemo } from 'react';
import { Plus, Sparkles, Upload, Brain, Network, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Generate mock seed data
const generateSeedData = () => {
  const seeds = [];
  for (let week = 0; week < 52; week++) {
    for (let day = 0; day < 7; day++) {
      const activity = Math.random();
      const level = activity < 0.3 ? 0 : activity < 0.5 ? 1 : activity < 0.7 ? 2 : activity < 0.9 ? 3 : 4;
      seeds.push({
        week,
        day,
        level,
        date: new Date(2024, 0, week * 7 + day + 1),
        seeds: Math.floor(Math.random() * 5),
      });
    }
  }
  return seeds;
};

export default function MemorySeedsPage() {
  const seedData = useMemo(() => generateSeedData(), []);
  const [isNewSeedOpen, setIsNewSeedOpen] = useState(false);
  
  // Calculate stats
  const totalFiles = 3;
  const maxFiles = 3;
  const totalSeeds = seedData.filter(d => d.seeds > 0).length;
  const maxSeeds = 24;
  const totalTokens = 6000;
  const maxTokens = 7000;

  const getSeedColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-800/30 border-gray-700/30';
      case 1: return 'bg-fuchsia-900/40 border-fuchsia-800/40';
      case 2: return 'bg-fuchsia-700/60 border-fuchsia-600/60';
      case 3: return 'bg-fuchsia-500/80 border-fuchsia-400/80';
      case 4: return 'bg-fuchsia-400 border-fuchsia-300';
      default: return 'bg-gray-800/30 border-gray-700/30';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sementes de Memoria</h2>
          <p className="text-muted-foreground">
            Visualize suas memórias plantadas ao longo do tempo
          </p>
        </div>
        <Dialog open={isNewSeedOpen} onOpenChange={setIsNewSeedOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Semente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl rounded-xl bg-gray-900 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-center space-y-4 pb-6">
              <DialogTitle className="text-2xl font-bold text-white">
                Bem-vindo ao seu Jardim de Memoria
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-base max-w-2xl mx-auto">
                Plante suas ideias, amplie seu conhecimento. Adicione seu conteúdo acima e
                veja como a IA o transforma em um jardim de sabedoria.
              </DialogDescription>
            </DialogHeader>

            {/* Steps */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              {/* Step 1 */}
              <Card className="bg-gray-800/50 border-gray-700/50 p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Etapa 1: Carregar
                </h3>
                <p className="text-sm text-gray-400">
                  Adicione seu conteúdo acima
                </p>
              </Card>

              {/* Step 2 */}
              <Card className="bg-gray-800/50 border-gray-700/50 p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Etapa 2: Processamento de IA
                </h3>
                <p className="text-sm text-gray-400">
                  A IA extrai sementes de conhecimento
                </p>
              </Card>

              {/* Step 3 */}
              <Card className="bg-gray-800/50 border-gray-700/50 p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Network className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Etapa 3: Correspondência Inteligente
                </h3>
                <p className="text-sm text-gray-400">
                  As sementes impulsionam seus bate-papos com IA
                </p>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setIsNewSeedOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Começar a Plantar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Memory Seeds Visualization */}
      <Card className="w-full max-w-4xl bg-gray-900/50 border-gray-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              <span className="text-white font-medium">Sementes de Memoria</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-white font-medium">{totalFiles}/{maxFiles}</span>
              <span className="text-gray-400 ml-1">Files</span>
            </div>
            <div>
              <span className="text-white font-medium">{totalSeeds}/{maxSeeds}</span>
              <span className="text-gray-400 ml-1">Seeds</span>
            </div>
            <div>
              <span className="text-white font-medium">{totalTokens.toLocaleString()}/{maxTokens.toLocaleString()}</span>
              <span className="text-gray-400 ml-1">Tokens</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Seeds Grid */}
          <div className="space-y-1">
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <div key={dayIndex} className="flex gap-1">
                {Array.from({ length: 52 }, (_, weekIndex) => {
                  const seed = seedData.find(s => s.week === weekIndex && s.day === dayIndex);
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`
                        w-3 h-3 rounded-sm border transition-all duration-200 hover:scale-110 cursor-pointer
                        ${getSeedColor(seed?.level || 0)}
                      `}
                      title={`${seed?.seeds || 0} sementes - ${seed?.date.toLocaleDateString()}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-between mt-6 text-xs text-gray-400">
            <span>Jan</span>
            <span>Mar</span>
            <span>Mai</span>
            <span>Jul</span>
            <span>Set</span>
            <span>Nov</span>
          </div>
          
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-400">
            <span>Menos</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`w-2 h-2 rounded-sm border ${getSeedColor(level)}`}
                />
              ))}
            </div>
            <span>Mais</span>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sementes</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSeeds}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde o mês passado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Utilizados</CardTitle>
            <div className="h-4 w-4 rounded bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((totalTokens / maxTokens) * 100).toFixed(1)}% do limite
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak Atual</CardTitle>
            <div className="h-4 w-4 rounded bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 dias</div>
            <p className="text-xs text-muted-foreground">
              Continue plantando sementes!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}