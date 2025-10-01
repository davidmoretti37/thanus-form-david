'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, Wand2, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { IconPicker } from './icon-picker';
import { AgentAvatar } from '../../thread/content/agent-avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { useGenerateAgentIcon } from '@/hooks/react-query/agents/use-agent-icon-generation';

interface AgentIconEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentName?: string;
  agentDescription?: string;
  currentIconName?: string;
  currentIconColor?: string;
  currentBackgroundColor?: string;
  onIconUpdate?: (iconName: string | null, iconColor: string, backgroundColor: string) => void;
}

export function AgentIconEditorDialog({
  isOpen,
  onClose,
  agentName,
  agentDescription,
  currentIconName,
  currentIconColor = '#000000',
  currentBackgroundColor = '#F3F4F6',
  onIconUpdate,
}: AgentIconEditorDialogProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIconName || 'bot');
  const [iconColor, setIconColor] = useState(currentIconColor || '#000000');
  const [backgroundColor, setBackgroundColor] = useState(currentBackgroundColor || '#e5e5e6');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Debug props when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔧 AgentIconEditorDialog opened with props:', {
        agentName,
        currentIconName,
        currentIconColor: iconColor,
        currentBackgroundColor: backgroundColor,
        onIconUpdate: !!onIconUpdate
      });
    }
  }, [isOpen, agentName, currentIconName, iconColor, backgroundColor, onIconUpdate]);

  // Initialize the generate icon mutation
  const generateIconMutation = useGenerateAgentIcon();

  // Helper to load an image element from data URL for canvas rendering
  const loadImage = useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const handleIconSave = useCallback(async () => {
    // If user uploaded an image, save that (with current scale) instead of icon selection
    if (uploadedImage && loadedImage) {
      try {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        // Fill background
        ctx.fillStyle = backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Fit image with 'contain' behavior, then apply scale
        const ratio = Math.min(size / loadedImage.naturalWidth, size / loadedImage.naturalHeight);
        const baseW = loadedImage.naturalWidth * ratio;
        const baseH = loadedImage.naturalHeight * ratio;

        const drawW = baseW * imageScale;
        const drawH = baseH * imageScale;

        const dx = (size - drawW) / 2;
        const dy = (size - drawH) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(loadedImage, dx, dy, drawW, drawH);

        const dataUrl = canvas.toDataURL('image/png');
        if (onIconUpdate) {
          onIconUpdate(null, dataUrl, backgroundColor);
          toast.success('Agent image updated!');
          onClose();
        }
      } catch (err) {
        console.error('Failed to save uploaded image', err);
        toast.error('Failed to save image. Please try again.');
      }
      return;
    }

    // Otherwise, proceed with icon save flow
    if (onIconUpdate) {
      onIconUpdate(selectedIcon, iconColor, backgroundColor);
      // Toast will be shown by parent component
      onClose();
    }
  }, [
    uploadedImage,
    loadedImage,
    imageScale,
    backgroundColor,
    onIconUpdate,
    selectedIcon,
    iconColor,
    onClose
  ]);

  const handleAutoGenerate = useCallback(() => {
    if (!agentName) {
      toast.error('Agent name is required for auto-generation');
      return;
    }

    generateIconMutation.mutate(
      {
        name: agentName,
        description: agentDescription,
      },
      {
        onSuccess: (result) => {
          // If previously using an uploaded image, clear it because we switch to icon flow
          setUploadedImage(null);
          setLoadedImage(null);
          setImageScale(1);

          setSelectedIcon(result.icon_name);
          setIconColor(result.icon_color);
          setBackgroundColor(result.icon_background);
          toast.success('Agent icon auto-generated!');
        },
        onError: (error) => {
          console.error('Auto-generation failed:', error);
          toast.error('Failed to auto-generate icon. Please try again.');
        },
      }
    );
  }, [agentName, agentDescription, generateIconMutation]);

  const presetColors = [
    '#000000', '#FFFFFF', '#6366F1', '#10B981', '#F59E0B',
    '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#06B6D4', '#84CC16', '#F43F5E', '#A855F7', '#3B82F6'
  ];

  const ColorPickerField = ({
    label,
    color,
    onChange,
  }: {
    label: string;
    color: string;
    onChange: (color: string) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-3">
          <Popover open={isOpen} onOpenChange={(open) => {
            if (!open || !isInteracting) {
              setIsOpen(open);
            }
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-10 w-12 rounded-md border cursor-pointer hover:border-primary/50 transition-colors"
                style={{ backgroundColor: color }}
                aria-label={`${label} color`}
              />
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-3"
              align="start"
              side="bottom"
              sideOffset={5}
              onInteractOutside={(e) => {
                if (isInteracting) {
                  e.preventDefault();
                  return;
                }

                const target = e.target as HTMLElement;
                const isColorPickerElement = target.closest('[class*="react-colorful"]') ||
                  target.className.includes('react-colorful') ||
                  target.closest('.react-colorful-container');

                if (isColorPickerElement) {
                  e.preventDefault();
                }
              }}
            >
              <div className="space-y-3">
                <div
                  className="react-colorful-container"
                  onMouseDown={() => setIsInteracting(true)}
                  onMouseUp={() => setIsInteracting(false)}
                  onTouchStart={() => setIsInteracting(true)}
                  onTouchEnd={() => setIsInteracting(false)}
                >
                  <HexColorPicker
                    color={color}
                    onChange={(newColor) => {
                      onChange(newColor);
                    }}
                    style={{ width: '200px', height: '150px' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      const hex = e.target.value;
                      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex) || hex.startsWith('#')) {
                        onChange(hex.toUpperCase());
                      }
                    }}
                    placeholder="#000000"
                    className="font-mono text-sm flex-1"
                    maxLength={7}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsInteracting(false);
                      setIsOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Input
            type="text"
            value={color}
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex) || hex.startsWith('#')) {
                onChange(hex.toUpperCase());
              }
            }}
            placeholder="#000000"
            className="font-mono text-sm"
            maxLength={7}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Presets</Label>
          <div className="grid grid-cols-8 gap-1">
            {presetColors.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => onChange(presetColor)}
                className={cn(
                  "w-7 h-7 rounded border-2 transition-all hover:scale-110",
                  color === presetColor ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                )}
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const presetThemes = [
    { bg: '#6366F1', icon: '#FFFFFF', name: 'Indigo' },
    { bg: '#10B981', icon: '#FFFFFF', name: 'Emerald' },
    { bg: '#F59E0B', icon: '#1F2937', name: 'Amber' },
    { bg: '#EF4444', icon: '#FFFFFF', name: 'Red' },
    { bg: '#8B5CF6', icon: '#FFFFFF', name: 'Purple' },
  ];

  const ColorControls = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-2 py-3">
        <AgentAvatar
          iconName={selectedIcon}
          iconColor={iconColor}
          backgroundColor={backgroundColor}
          agentName={agentName}
          size={100}
          className="border shadow-lg"
        />
        <div className="text-center">
          <p className="font-medium">{agentName || 'Agent'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <ColorPickerField
          label="Icon Color"
          color={iconColor}
          onChange={setIconColor}
        />

        <ColorPickerField
          label="Background Color"
          color={backgroundColor}
          onChange={setBackgroundColor}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Quick Themes</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {presetThemes.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setIconColor(preset.icon);
                setBackgroundColor(preset.bg);
              }}
              className={cn(
                "group relative h-12 w-full rounded-xl border-2 transition-all hover:scale-105",
                backgroundColor === preset.bg && iconColor === preset.icon
                  ? "border-primary shadow-md"
                  : "border-border hover:border-primary/60"
              )}
              style={{ backgroundColor: preset.bg }}
              title={preset.name}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <Sparkles
                  className="w-4 h-4"
                  style={{ color: preset.icon }}
                />
              </span>
              <span className="sr-only">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Image tab content (upload + scale)
  const ImageUploadContent = () => {
    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result);
        setUploadedImage(dataUrl);
        try {
          const img = await loadImage(dataUrl);
          setLoadedImage(img);
          setImageScale(1);
        } catch {
          toast.error('Failed to load image preview.');
          setLoadedImage(null);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read the selected file.');
      };
      reader.readAsDataURL(file);
    };

    const onClearImage = () => {
      setUploadedImage(null);
      setLoadedImage(null);
      setImageScale(1);
    };

    return (
      <div className="flex flex-col h-full">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Upload Image</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={onFileChange}
            />
            {uploadedImage && (
              <Button type="button" variant="outline" onClick={onClearImage} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <Label className="text-sm font-medium">Preview</Label>
            <div
              className="mt-2 flex items-center justify-center rounded-2xl border bg-muted/30"
              style={{
                width: '100%',
                height: 280,
              }}
            >
              <div
                className="rounded-2xl shadow-inner flex items-center justify-center"
                style={{
                  width: 220,
                  height: 220,
                  backgroundColor: backgroundColor || '#e5e5e5',
                  overflow: 'hidden',
                }}
              >
                {uploadedImage ? (
                  // Use CSS scale for smooth preview; final rendering is done on canvas on save
                  <img
                    src={uploadedImage}
                    alt="Uploaded preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      transform: `scale(${imageScale})`,
                      transformOrigin: 'center center',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs">No image selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Size</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.2}
                max={2}
                step={0.05}
                value={imageScale}
                onChange={(e) => setImageScale(parseFloat(e.target.value))}
                className="flex-1"
              />
              <div className="w-12 text-right tabular-nums text-sm">{imageScale.toFixed(2)}x</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Adjust how large the image appears inside the square. The final image is baked at 512×512.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Customize Agent Icon
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 py-4 overflow-auto">
          <Tabs defaultValue="icons" className="h-full flex flex-col">
            <div className="flex gap-6 w-full">
              <div className="flex-1 min-w-0">
                <TabsList className="grid w-full grid-cols-2 shrink-0 mb-3">
                  <TabsTrigger value="icons">Icons</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                </TabsList>

                <TabsContent value="icons" className="flex-1 min-h-0">
                  <IconPicker
                    selectedIcon={selectedIcon}
                    onIconSelect={setSelectedIcon}
                    iconColor={iconColor}
                    className="h-full"
                  />
                </TabsContent>

                <TabsContent value="image" className="flex-1 min-h-0">
                  <ImageUploadContent />
                </TabsContent>
              </div>

              <Separator orientation="vertical" className="h-auto" />

              <div className="w-72 shrink-0">
                <ScrollArea className="h-[400px] pr-4">
                  <ColorControls />
                </ScrollArea>
              </div>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="px-4 py-3 shrink-0 border-t">
          <div className="flex items-center gap-2 mr-auto">
            <Button
              variant="outline"
              onClick={handleAutoGenerate}
              disabled={generateIconMutation.isPending || !agentName}
              className="gap-2"
            >
              {generateIconMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Auto-generate
            </Button>
          </div>

          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleIconSave}
            disabled={!selectedIcon || !iconColor || !backgroundColor}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
