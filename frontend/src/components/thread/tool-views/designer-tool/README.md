# Designer Canvas - React Flow

## 🎨 Visão Geral

Designer Canvas profissional com navegação React Flow para visualização e gerenciamento de designs.

## 🚀 Funcionalidades

### React Flow Canvas
- **Navegação Profissional**: Mouse wheel zoom, drag to pan
- **Controles Integrados**: Zoom in/out, fit view, fullscreen
- **Grid Background**: Guias visuais opcionais
- **Performance Otimizada**: Virtualização automática para muitos elementos

## 🎯 Como Usar

### 1. Navegação no Canvas
```
- Zoom: Roda do mouse
- Pan: Arrastar o fundo
- Mover Design: Arrastar o node
- Selecionar: Clicar no design
```

### 2. Exportar Designs
```
1. Selecionar design no canvas
2. Clicar botão Download na toolbar
3. Imagem baixa automaticamente
```

## 🛠️ Componentes

### `DesignerToolView.tsx`
Componente principal com React Flow integrado.

**Props:**
- `name`: Nome da tool
- `assistantContent`: Conteúdo do assistente
- `toolContent`: Conteúdo da tool
- `project`: Projeto atual
- `isStreaming`: Status de streaming
- `isSuccess`: Status de sucesso

**Features:**
- Canvas infinito com React Flow
- Controles integrados
- Grid toggle
- Export button

### `DesignNode.tsx`
Node customizado para exibir designs gerados.

**Data:**
- `sandboxId`: ID do sandbox
- `filePath`: Caminho do arquivo
- `directUrl`: URL direta (opcional)
- `width/height`: Dimensões do design
- `locked`: Status de bloqueio
- `onSelect`: Callback ao selecionar

## 🎯 Integração com Backend

### Designer Tool
```python
# backend/core/tools/sb_designer_tool.py

designer_create_or_edit(
    mode="create",
    prompt="Create a modern design...",
    platform_preset="instagram_square",
    design_style="modern"
)
```

## 🔄 Workflow

```
1. User solicita criação de design
   ↓
2. designer_create_or_edit processa prompt
   ↓
3. OpenRouter/LiteLLM gera design
   ↓
4. Design aparece como novo node no React Flow
```

## 📐 Layout da Toolbar

```
[Grid] [Export] | [Ready Badge]
```

Minimalista e focado.

## 🎨 Estilos Customizados

### Selected Node
- Ring roxo (purple-500)
- Shadow destacada

### Grid Background
- Linhas sutis a cada 20px
- Toggle on/off disponível

## 💻 Exemplo de Código

```typescript
// Usar o componente
<DesignerToolView
  name="designer_create_or_edit"
  assistantContent={content}
  toolContent={toolData}
  project={currentProject}
  isStreaming={false}
  isSuccess={true}
/>
```

## 🐛 Troubleshooting

### Export não funciona
- Verificar se um design está selecionado
- Verificar se `directUrl` ou `filePath` está disponível

## 📚 Referências

- [React Flow Docs](https://reactflow.dev)
- [OpenRouter API](https://openrouter.ai)
