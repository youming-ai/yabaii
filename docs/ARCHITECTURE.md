# Umuo App Architecture Documentation

This document provides a comprehensive overview of the Umuo App architecture, including design decisions, patterns, and best practices.

## 🏗️ Overview

Umuo App is a language learning application focused on shadowing practice with AI-powered audio transcription. The architecture is designed for scalability, maintainability, and developer productivity.

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │   Components    │  │     Hooks       │  │    Contexts     ││
│  │   - Features    │  │   - API Hooks   │  │   - Theme       ││
│  │   - Layout      │  │   - DB Hooks    │  │   - Language    ││
│  │   - UI          │  │   - UI Hooks    │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  State Management Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │  TanStack Query │  │   React Hooks   │  │    IndexedDB    ││
│  │  - Server State │  │  - Local State  │  │  - Client DB    ││
│  │  - Caching      │  │  - Effects      │  │  - Dexie ORM    ││
│  │  - Synchronization│ │                 │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │   /api/transcribe│  │ /api/postprocess │  │  /api/health    ││
│  │  - Groq SDK     │  │  - Text Norm.    │  │  - Monitoring   ││
│  │  - Whisper V3   │  │  - Translation   │  │                 ││
│  │  - Rate Limiting│  │  - Annotations   │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │    Groq API     │  │    Vercel       │  │   Browser APIs  ││
│  │  - Whisper      │  │  - Analytics     │  │  - Audio API    ││
│  │  - LLM Models   │  │  - Speed Insights│  │  - IndexedDB    ││
│  │  - Text Processing│ │  - Deployment   │  │  - File System  ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 🏛️ Core Architectural Principles

### 1. Separation of Concerns

Each layer has distinct responsibilities:
- **Presentation Layer**: UI components and user interactions
- **Business Logic Layer**: Hooks and state management
- **Data Access Layer**: Database operations and API calls
- **Service Layer**: External integrations

### 2. Data Flow

```typescript
// Unidirectional data flow
User Action → Component → Hook → API/DB → State Update → UI Re-render
```

### 3. Type Safety

- **TypeScript**: Strict mode enabled
- **Zod Schemas**: Runtime validation for API inputs
- **Typed Database**: Full TypeScript integration with IndexedDB

## 🗄️ Database Architecture

### Schema Design

```typescript
// Database version 3 with enhanced features
interface DatabaseSchema {
  files: {
    id: number;
    name: string;
    size: number;
    type: string;
    blob: Blob;
    uploadedAt: Date;
    updatedAt: Date;
  };

  transcripts: {
    id: number;
    fileId: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    language: string;
    rawText: string;
    processingTime: number;
    createdAt: Date;
    updatedAt: Date;
  };

  segments: {
    id: number;
    transcriptId: number;
    start: number;
    end: number;
    text: string;
    wordTimestamps: WordTimestamp[];
    normalizedText: string;
    translation: string;
    annotations: Annotation[];
    furigana: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
```

### Data Access Layer

Unified through `DBUtils` class:

```typescript
// Simplified, type-safe database operations
export const DBUtils = {
  // Generic CRUD
  async add<T>(table: Table<T, number>, item: Omit<T, 'id'>): Promise<number>
  async get<T>(table: Table<T, number>, id: number): Promise<T | undefined>
  async update<T>(table: Table<T, number>, id: number, changes: Partial<T>): Promise<number>
  async delete<T>(table: Table<T, number>, id: number): Promise<void>

  // Specialized operations
  async addFile(file: Omit<FileRow, 'id'>): Promise<number>
  async getSegmentsByTranscriptId(transcriptId: number): Promise<Segment[]>
  async findSegmentsByTimeRange(transcriptId: number, start: number, end: number): Promise<Segment[]>
}
```

## 🔄 State Management Architecture

### TanStack Query Integration

```typescript
// Query keys structure
export const transcriptionKeys = {
  all: ['transcription'] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, 'file', fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), 'progress'] as const,
};

// Hook example
export function useTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFile(fileId),
    queryFn: async () => {
      const transcript = await DBUtils.findTranscriptByFileId(fileId);
      if (transcript?.id) {
        const segments = await DBUtils.getSegmentsByTranscriptIdOrdered(transcript.id);
        return { transcript, segments };
      }
      return { transcript: null, segments: [] };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
```

### Context Management

```typescript
// Theme context for UI theming
const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
});

// Language context for transcription settings
const TranscriptionLanguageContext = createContext<{
  learningLanguage: TranscriptionLanguage;
  setLearningLanguage: (language: TranscriptionLanguage) => void;
}>({});
```

## 🤖 AI Integration Architecture

### Groq SDK Integration

```typescript
// Direct SDK integration for performance
const transcription = await groq.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-large-v3-turbo",
  temperature: 0,
  response_format: "verbose_json",
  language: normalizedLanguage,
  timestamp_granularities: ["word", "segment"],
});
```

### Post-Processing Pipeline

```
Raw Transcription → Normalization → Translation → Annotations → Storage
```

### Error Handling & Recovery

```typescript
// Comprehensive error handling with retry logic
class NetworkResilienceManager {
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T>
}
```

## 🧩 Component Architecture

### Feature-Based Organization

```
src/components/features/
├── file/           # File management features
│   ├── FileUpload.tsx
│   ├── FileManager.tsx
│   └── FileCard.tsx
├── player/         # Audio player features
│   ├── PlayerPage.tsx
│   ├── ScrollableSubtitleDisplay.tsx
│   └── AudioControls.tsx
└── settings/       # Settings features
    └── LearningLanguageSection.tsx
```

### Component Patterns

#### 1. Container/Presentational Pattern

```typescript
// Container component (handles logic)
const PlayerContainer: React.FC = () => {
  const { file, segments, loading } = usePlayerData(fileId);
  return <PlayerDisplay file={file} segments={segments} loading={loading} />;
};

// Presentational component (handles UI)
const PlayerDisplay: React.FC<PlayerProps> = ({ file, segments, loading }) => {
  if (loading) return <LoadingSpinner />;
  return <PlayerUI file={file} segments={segments} />;
};
```

#### 2. Compound Component Pattern

```typescript
// Card component with compound parts
<Card>
  <Card.Header>
    <Card.Title>Audio File</Card.Title>
  </Card.Header>
  <Card.Body>
    <Card.Content>File content here</Card.Content>
  </Card.Body>
  <Card.Footer>
    <Card.Actions>
      <Button onClick={handlePlay}>Play</Button>
    </Card.Actions>
  </Card.Footer>
</Card>
```

## 🔐 Security Architecture

### API Security

```typescript
// Rate limiting with sliding window
const rateLimitResult = checkRateLimit(`transcribe:${clientId}`, rateLimitConfig);

// Input validation with Zod
const validatedInput = transcribeSchema.safeParse(requestBody);

// Error handling without information leakage
const errorMessage = isProduction
  ? "Service temporarily unavailable"
  : error.message;
```

### Client-Side Security

```typescript
// Sanitize user inputs
const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Validate file types
const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

## ⚡ Performance Optimizations

### Memory Management

```typescript
// WeakMap for audio URL caching to prevent memory leaks
const audioUrlCache = new WeakMap<Blob, string>();

// Cleanup on component unmount
useEffect(() => {
  return () => {
    audioUrl && URL.revokeObjectURL(audioUrl);
  };
}, [audioUrl]);
```

### Database Optimization

```typescript
// Batch processing for large datasets
const BATCH_SIZE = 100;
for (let i = 0; i < segments.length; i += BATCH_SIZE) {
  const batch = segments.slice(i, i + BATCH_SIZE);
  await DBUtils.bulkAdd(db.segments, batch);
}
```

### Caching Strategy

```typescript
// Multi-level caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      gcTime: 1000 * 60 * 10,    // 10 minutes
      retry: 3,
    },
  },
});
```

## 🚀 Deployment Architecture

### Vercel Integration

```
GitHub → Vercel (Automatic Deployment)
    ↓
Build Process
    ↓
Production Deployment
    ↓
Edge CDN Distribution
```

### Environment Configuration

```typescript
// Environment-specific behavior
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Feature flags
const ENABLE_ANALYTICS = isProduction;
const ENABLE_DEBUG_TOOLS = isDevelopment;
```

## 📈 Monitoring & Analytics

### Performance Monitoring

```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Error Monitoring

```typescript
// Centralized error reporting
const handleError = (error: Error, context: string) => {
  console.error(`[${context}] ${error.message}`, error);

  // Send to monitoring service in production
  if (isProduction) {
    analytics.track('error', {
      message: error.message,
      context,
      stack: error.stack,
    });
  }
};
```

## 🔄 Migration Strategy

### Database Migrations

```typescript
// Versioned migrations with fallback handling
this.version(3)
  .stores({
    files: "++id, name, size, type, uploadedAt, updatedAt",
    transcripts: "++id, fileId, status, language, createdAt, updatedAt",
    segments: "++id, transcriptId, start, end, text, wordTimestamps, normalizedText, translation, annotations, furigana"
  })
  .upgrade(async () => {
    // Migration logic
    await migrateToVersion3();
  });
```

### API Versioning

```typescript
// Future-proof API design
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Backward compatibility
app.use('/api', (req, res, next) => {
  req.url = `/v1${req.url}`;
  next();
});
```

## 📚 Best Practices

### Code Organization

1. **Single Responsibility**: Each function/component does one thing well
2. **Dependency Injection**: Use hooks and context for dependencies
3. **Error Boundaries**: Implement proper error boundaries
4. **Loading States**: Always show loading states for async operations

### Performance Guidelines

1. **Lazy Loading**: Use React.lazy for route components
2. **Memoization**: Use useMemo/useMemo for expensive computations
3. **Bundle Analysis**: Regular bundle size analysis
4. **Image Optimization**: Use Next.js Image component

### Security Guidelines

1. **Input Validation**: Validate all user inputs
2. **Output Sanitization**: Sanitize all outputs
3. **Rate Limiting**: Implement rate limiting on all APIs
4. **HTTPS Only**: Enforce HTTPS in production

## 🔮 Future Architecture Considerations

### Scalability

- **Microservices**: Consider microservices for specific features
- **Caching Layer**: Redis for distributed caching
- **CDN**: Global content delivery network
- **Load Balancing**: Multiple server instances

### Technology Evolution

- **WebAssembly**: For audio processing
- **Service Workers**: For offline functionality
- **WebRTC**: For real-time features
- **GraphQL**: For complex data queries

---

This architecture documentation serves as a living document. As the application evolves, this document should be updated to reflect architectural changes and decisions.