# Video Tool View - OpenCut Integration

## Overview

The VideoToolView component provides an integrated video editing experience by embedding OpenCut editor directly in the interface. Videos generated or edited through Fal AI are automatically displayed in the OpenCut timeline.

## Key Features

### 1. Immediate OpenCut Display
- OpenCut editor is displayed **immediately** when the video tool is invoked
- No waiting for video generation to complete before showing the interface
- Project-specific OpenCut instance tied to the current thread

### 2. Automatic Video Timeline Integration
- Generated videos automatically appear in the OpenCut timeline
- Videos are added as clips ready for editing
- Similar behavior to the Designer Tool's canvas integration

### 3. Real-time Status Feedback
- Loading overlay during video generation
- Clear visual feedback when videos are being processed
- Empty state with instructions when no videos are present

### 4. Multi-Video Support
- Multiple videos can be generated in sequence
- Each video automatically added to the timeline
- De-duplication ensures videos aren't added twice

## Architecture

### Component Flow

```
VideoToolView
├── OpenCutEmbed (always visible)
│   └── Receives mediaUrls array
├── Loading Overlay (when isStreaming)
└── Empty State (when no videos)
```

### State Management

```typescript
// Track videos added to timeline
const [addedVideos, setAddedVideos] = useState<string[]>([]);

// Prevent duplicate additions
const lastProcessedUrl = useRef<string>('');

// Auto-add videos when they become available
useEffect(() => {
  if (!displayUrl || isStreaming) return;
  
  const videoKey = `${displayUrl}-${payload.mode || 'video'}`;
  if (lastProcessedUrl.current === videoKey) return;
  
  lastProcessedUrl.current = videoKey;
  setAddedVideos(prev => [...new Set([...prev, newUrls])]);
}, [displayUrl, isStreaming]);
```

## Integration Points

### 1. OpenCut Protocol
The component uses the OpenCut messaging protocol to:
- Send handshake when iframe loads
- Import clips into the timeline
- Handle ready/error states

### 2. Video Sources
Videos can come from:
- **Sandbox URLs**: `/api/sandboxes/{id}/files?path=...`
- **Fal AI URLs**: Direct URLs from Fal video generation

### 3. Backend Tool Response
Expected payload structure:
```typescript
{
  success: boolean,
  video_path: string,        // Local sandbox path
  video_url: string,         // Sandbox API URL
  sandbox_id: string,        // Sandbox identifier
  mode: 'generate' | 'edit',
  model: string,             // Fal model used
  fal_video_url: string,     // Direct Fal URL
  message: string
}
```

## User Experience

### When Tool is Invoked
1. OpenCut editor appears immediately
2. Loading overlay shows "Generating Video" message
3. User can see the timeline interface waiting for content

### When Video is Generated
1. Loading overlay fades out
2. Video automatically appears in timeline
3. User can immediately start editing

### Multiple Videos
1. Each new video is automatically added to timeline
2. Videos stack in sequence
3. User can arrange, trim, and edit all videos

## Comparison with Designer Tool

### Similarities
- Immediate interface display
- Auto-population of content (videos/images)
- Professional editing environment
- Real-time status feedback

### Differences
- Designer Tool: ReactFlow canvas with draggable nodes
- Video Tool: OpenCut timeline with video clips
- Designer Tool: Multiple artboards
- Video Tool: Single timeline with multiple clips

## Configuration

### Environment Variables
```bash
NEXT_PUBLIC_OPENCUT_URL=http://localhost:3000  # Or https://opencut.app
```

### OpenCut Parameters
- `hideWelcome=true`: Skip welcome popup
- Direct to `/projects` route for immediate access

## Future Enhancements

### Potential Improvements
1. **Project Persistence**: Save OpenCut project state per thread
2. **Export Integration**: Direct export from OpenCut back to sandbox
3. **Template Support**: Pre-configured timeline templates
4. **Audio Integration**: Automatic audio track addition
5. **Transition Effects**: Pre-set transitions between video clips

### Advanced Features
- Real-time collaboration on video edits
- AI-suggested cuts and transitions
- Auto-caption generation
- Background music library integration

## Technical Notes

### Performance
- OpenCut iframe loads independently
- Video URLs are passed via postMessage
- No video data transferred through React state
- Efficient de-duplication prevents re-renders

### Browser Compatibility
- Requires modern browser with postMessage support
- OpenCut requires WebGL for video rendering
- Tested on Chrome, Firefox, Safari, Edge

### Security
- Sandbox allows necessary features for video editing
- Cross-origin communication via postMessage
- Video URLs use internal API authentication

## Troubleshooting

### Videos Not Appearing
1. Check browser console for OpenCut messages
2. Verify video URLs are accessible
3. Ensure OpenCut handshake completed
4. Check network requests for video loading

### OpenCut Not Loading
1. Verify NEXT_PUBLIC_OPENCUT_URL is set
2. Check network connectivity to OpenCut
3. Ensure iframe sandbox permissions are correct
4. Review browser console for errors

### Performance Issues
1. Limit number of simultaneous video generations
2. Consider video resolution and file size
3. Check available system memory
4. Use smaller video clips for timeline
