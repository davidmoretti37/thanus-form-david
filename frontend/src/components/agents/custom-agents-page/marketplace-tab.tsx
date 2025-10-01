'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from './search-bar';
import { MarketplaceSectionHeader } from './marketplace-section-header';
import { UnifiedAgentCard } from '@/components/ui/unified-agent-card';
import { Pagination } from '../pagination';

import type { MarketplaceTemplate } from '@/components/agents/installation/types';

interface MarketplaceTabProps {
  marketplaceSearchQuery: string;
  setMarketplaceSearchQuery: (value: string) => void;
  marketplaceFilter: 'all' | 'kortix' | 'community' | 'mine';
  setMarketplaceFilter: (value: 'all' | 'kortix' | 'community' | 'mine') => void;
  marketplaceLoading: boolean;
  allMarketplaceItems: MarketplaceTemplate[];
  mineItems: MarketplaceTemplate[];
  installingItemId: string | null;
  onInstallClick: (item: MarketplaceTemplate, e?: React.MouseEvent) => void;
  onDeleteTemplate?: (item: MarketplaceTemplate, e?: React.MouseEvent) => void;
  getItemStyling: (item: MarketplaceTemplate) => { color: string };
  currentUserId?: string;
  onAgentPreview?: (agent: MarketplaceTemplate) => void;
  
  marketplacePage: number;
  setMarketplacePage: (page: number) => void;
  marketplacePageSize: number;
  onMarketplacePageSizeChange: (pageSize: number) => void;
  marketplacePagination?: {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export const MarketplaceTab = ({
  marketplaceSearchQuery,
  setMarketplaceSearchQuery,
  marketplaceFilter,
  setMarketplaceFilter,
  marketplaceLoading,
  allMarketplaceItems,
  mineItems,
  installingItemId,
  onInstallClick,
  onDeleteTemplate,
  getItemStyling,
  currentUserId,
  onAgentPreview,
  marketplacePage,
  setMarketplacePage,
  marketplacePageSize,
  onMarketplacePageSizeChange,
  marketplacePagination
}: MarketplaceTabProps) => {
  const handleAgentClick = (item: MarketplaceTemplate) => {
    if (onAgentPreview) {
      onAgentPreview(item);
    }
  };

  return (
    <div className="space-y-4 mt-2 flex flex-col min-h-full">
      <div className="w-full flex justify-center mb-[5cm]">
        <SearchBar
          placeholder="Pesquisar agentes..."
          value={marketplaceSearchQuery}
          onChange={setMarketplaceSearchQuery}
          className="w-full max-w-3xl"
        />
      </div>

      <div className="flex-1">
        {marketplaceLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
                <Skeleton className="h-48" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-5 rounded w-3/4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 rounded" />
                    <Skeleton className="h-4 rounded w-5/6" />
                  </div>
                  <Skeleton className="h-10 rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : allMarketplaceItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {marketplaceSearchQuery 
                ? "Nenhum modelo encontrado com os critérios atuais. Tente ajustar sua busca ou filtros."
                : "Nenhum modelo disponível no marketplace no momento."}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {marketplaceFilter === 'all' && (
              <>
                {/* <MarketplaceSectionHeader
                  title="Popular Agents"
                  subtitle="Sorted by popularity - most downloads first"
                /> */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {allMarketplaceItems.map((item) => (
                    <UnifiedAgentCard
                      key={item.id}
                      variant="marketplace"
                      data={{
                        id: item.id,
                        name: item.name,
                        tags: item.tags,
                        created_at: item.created_at,
                        creator_id: item.creator_id,
                        creator_name: item.creator_name,
                        is_kortix_team: item.is_kortix_team,
                        download_count: item.download_count,
                        marketplace_published_at: item.marketplace_published_at,
                        icon_name: item.icon_name,
                        icon_color: item.icon_color,
                        icon_background: item.icon_background,
                      }}
                      state={{
                        isActioning: installingItemId === item.id,
                      }}
                      actions={{
                        onPrimaryAction: () => onInstallClick(item),
                        onDeleteAction: () => onDeleteTemplate(item),
                        onClick: () => handleAgentClick(item),
                      }}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              </>
            )}
            {marketplaceFilter !== 'all' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allMarketplaceItems.map((item) => (
                  <UnifiedAgentCard
                    key={item.id}
                    variant="marketplace"
                    data={{
                      id: item.id,
                      name: item.name,
                      tags: item.tags,
                      created_at: item.created_at,
                      creator_id: item.creator_id,
                      creator_name: item.creator_name,
                      is_kortix_team: item.is_kortix_team,
                      download_count: item.download_count,
                      marketplace_published_at: item.marketplace_published_at,
                      icon_name: item.icon_name,
                      icon_color: item.icon_color,
                      icon_background: item.icon_background,
                    }}
                    state={{
                      isActioning: installingItemId === item.id,
                    }}
                    actions={{
                      onPrimaryAction: () => onInstallClick(item),
                      onDeleteAction: () => onDeleteTemplate(item),
                      onClick: () => handleAgentClick(item),
                    }}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
            {marketplacePagination && (
              <Pagination
                currentPage={marketplacePagination.current_page}
                totalPages={marketplacePagination.total_pages}
                totalItems={marketplacePagination.total_items}
                pageSize={marketplacePagination.page_size}
                onPageChange={setMarketplacePage}
                onPageSizeChange={onMarketplacePageSizeChange}
                isLoading={marketplaceLoading}
                showPageSizeSelector={true}
                showJumpToPage={true}
                showResultsInfo={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
