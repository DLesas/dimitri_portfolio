# Dimitri's Portfolio

## Technical Achievements

### **Performance & Optimization**

- **Hardware detection system** (CPU cores, memory, GPU specs)
- **Adaptive performance scaling** based on device capabilities
- **`requestIdleCallback`** for non-blocking operations
- **Hardware-aware 3D rendering** optimization

### **Advanced React Architecture**

- **Multiple specialized contexts** (Debug, Hardware, Theme, Settings)
- **TypeScript generics** for reusable retry utility
- **Server-safe hydration** with fallback colors
- **Proper cleanup** of timeouts and event listeners

### **External API Integration**

- **The Color API integration** with exponential backoff retry
- **Color theory aware implementation** (analogic, complement schemes)
- **Automatic theme generation** from single primary color
- **HSL/Hex/RGBA conversion** utilities

### **3D Graphics & Interactions**

- **Three.js particle system** with physics
- **Mouse-responsive and DOM collision detection**
- **Performance-scaled animation loops**
- **Real-time FPS monitoring**

### **Error Handling & Resilience**

- **Generalized exponential backoff** utility
- **Graceful API failure degradation**
- **Context-aware retry strategies**

### **Build & Developer Experience**

- **Zero TypeScript compilation errors**
- **Complex nested popover navigation**
- **Debug mode** with hardware info display
- **Optimized bundle** with proper tree shaking

---

**Tech Stack**: Next.js 15, React 18, TypeScript, Three.js, HeroUI, The Color API

_Engineering achievement log - full docs pending_


graph TB
    subgraph "Component Layer"
        A[ColorSettingsPanel<br/>- Only sets primary color<br/>- Shows loading/error states]
    end
    
    subgraph "Global Theme Context"
        B[ThemeContext<br/>- Manages theme generation<br/>- 350ms debounce<br/>- LocalStorage persistence]
        C[Theme Generation<br/>- Runs independently<br/>- Continues after component unmount]
    end
    
    subgraph "API & Processing"
        D[Color API<br/>- Primary info<br/>- Color schemes]
        E[Local Processing<br/>- Generate shades locally<br/>- No API calls]
    end
    
    subgraph "Application"
        F[CSS Variables<br/>- Apply theme colors]
        G[Theme Extraction<br/>- Update context colors]
    end
    
    A -->|setPrimaryColor| B
    B -->|After 350ms| C
    C -->|3 API calls| D
    C -->|Calculate shades| E
    C -->|Apply| F
    F -->|Extract| G
    G -->|Update| B
    
    style A fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style F fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
