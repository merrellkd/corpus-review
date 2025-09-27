import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutModeType, DocumentLayoutResult } from '../../domain/value-objects/layout-mode';

/**
 * Animation configuration for layout transitions
 */
export interface LayoutTransitionConfig {
  duration: number; // in milliseconds
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | string;
  stagger: number; // delay between document animations in milliseconds
  enableStagger: boolean;
  respectReducedMotion: boolean;
}

/**
 * Document animation state
 */
export interface DocumentAnimationState {
  documentId: string;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  fromDimensions: { width: number; height: number };
  toDimensions: { width: number; height: number };
  fromZIndex: number;
  toZIndex: number;
  fromOpacity: number;
  toOpacity: number;
  delay: number;
  isAnimating: boolean;
}

/**
 * Props for the LayoutTransitionManager component
 */
export interface LayoutTransitionManagerProps {
  isTransitioning: boolean;
  fromLayoutMode: LayoutModeType;
  toLayoutMode: LayoutModeType;
  animations: DocumentAnimationState[];
  config: LayoutTransitionConfig;
  onTransitionComplete: () => void;
  onTransitionStart?: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Default transition configurations for different layout mode switches
 */
export const DEFAULT_TRANSITION_CONFIGS: Record<string, LayoutTransitionConfig> = {
  'stacked-to-grid': {
    duration: 400,
    easing: 'ease-out',
    stagger: 50,
    enableStagger: true,
    respectReducedMotion: true,
  },
  'stacked-to-freeform': {
    duration: 300,
    easing: 'ease-in-out',
    stagger: 30,
    enableStagger: true,
    respectReducedMotion: true,
  },
  'grid-to-stacked': {
    duration: 350,
    easing: 'ease-in',
    stagger: 40,
    enableStagger: true,
    respectReducedMotion: true,
  },
  'grid-to-freeform': {
    duration: 250,
    easing: 'ease-out',
    stagger: 20,
    enableStagger: false,
    respectReducedMotion: true,
  },
  'freeform-to-stacked': {
    duration: 400,
    easing: 'ease-in-out',
    stagger: 60,
    enableStagger: true,
    respectReducedMotion: true,
  },
  'freeform-to-grid': {
    duration: 350,
    easing: 'ease-out',
    stagger: 40,
    enableStagger: true,
    respectReducedMotion: true,
  },
  default: {
    duration: 300,
    easing: 'ease-in-out',
    stagger: 30,
    enableStagger: true,
    respectReducedMotion: true,
  },
};

/**
 * Hook for managing layout transition animations
 */
export const useLayoutTransitions = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentAnimations, setCurrentAnimations] = useState<DocumentAnimationState[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user prefers reduced motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Get transition configuration based on layout mode change
  const getTransitionConfig = useCallback((
    fromMode: LayoutModeType,
    toMode: LayoutModeType
  ): LayoutTransitionConfig => {
    const key = `${fromMode.toLowerCase()}-to-${toMode.toLowerCase()}`;
    const config = DEFAULT_TRANSITION_CONFIGS[key] || DEFAULT_TRANSITION_CONFIGS.default;

    // Respect user's motion preferences
    if (config.respectReducedMotion && prefersReducedMotion()) {
      return {
        ...config,
        duration: 0,
        stagger: 0,
        enableStagger: false,
      };
    }

    return config;
  }, [prefersReducedMotion]);

  // Create animation states from layout results
  const createAnimationStates = useCallback((
    layoutResults: DocumentLayoutResult[],
    config: LayoutTransitionConfig
  ): DocumentAnimationState[] => {
    return layoutResults.map((result, index) => ({
      documentId: result.id.toString(),
      fromPosition: result.position.toPoint(),
      toPosition: result.position.toPoint(),
      fromDimensions: result.dimensions.toSize(),
      toDimensions: result.dimensions.toSize(),
      fromZIndex: result.zIndex,
      toZIndex: result.zIndex,
      fromOpacity: result.isVisible ? 1 : 0,
      toOpacity: result.isVisible ? 1 : 0,
      delay: config.enableStagger ? index * config.stagger : 0,
      isAnimating: false,
    }));
  }, []);

  // Start layout transition
  const startTransition = useCallback((
    fromMode: LayoutModeType,
    toMode: LayoutModeType,
    layoutResults: DocumentLayoutResult[],
    onComplete?: () => void
  ) => {
    const config = getTransitionConfig(fromMode, toMode);
    const animations = createAnimationStates(layoutResults, config);

    setCurrentAnimations(animations);
    setIsTransitioning(true);

    // If duration is 0 (reduced motion), complete immediately
    if (config.duration === 0) {
      setIsTransitioning(false);
      setCurrentAnimations([]);
      if (onComplete) onComplete();
      return;
    }

    // Calculate total animation time including stagger
    const maxDelay = Math.max(...animations.map(a => a.delay));
    const totalDuration = config.duration + maxDelay;

    timeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setCurrentAnimations([]);
      if (onComplete) onComplete();
    }, totalDuration);
  }, [getTransitionConfig, createAnimationStates]);

  // Cancel current transition
  const cancelTransition = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsTransitioning(false);
    setCurrentAnimations([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTransition();
    };
  }, [cancelTransition]);

  return {
    isTransitioning,
    currentAnimations,
    startTransition,
    cancelTransition,
    getTransitionConfig,
  };
};

/**
 * Component for managing document transition animations
 */
export const LayoutTransitionManager: React.FC<LayoutTransitionManagerProps> = ({
  isTransitioning,
  fromLayoutMode,
  toLayoutMode,
  animations,
  config,
  onTransitionComplete,
  onTransitionStart,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTransitioning && onTransitionStart) {
      onTransitionStart();
    }
  }, [isTransitioning, onTransitionStart]);

  const getContainerClasses = () => {
    const baseClasses = 'layout-transition-container relative';
    const transitionClasses = isTransitioning ? 'transitioning' : '';
    const modeClasses = `transition-${fromLayoutMode.toLowerCase()}-to-${toLayoutMode.toLowerCase()}`;

    return `${baseClasses} ${transitionClasses} ${modeClasses} ${className}`;
  };

  return (
    <div
      ref={containerRef}
      className={getContainerClasses()}
      data-testid="layout-transition-manager"
      style={{
        '--transition-duration': `${config.duration}ms`,
        '--transition-easing': config.easing,
        '--transition-stagger': `${config.stagger}ms`,
      } as React.CSSProperties}
    >
      {children}

      {/* Transition overlay for debugging */}
      {isTransitioning && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded z-50">
          Transitioning: {fromLayoutMode} → {toLayoutMode}
        </div>
      )}
    </div>
  );
};

/**
 * Individual document transition wrapper
 */
export interface DocumentTransitionWrapperProps {
  documentId: string;
  animation: DocumentAnimationState;
  config: LayoutTransitionConfig;
  children: React.ReactNode;
}

export const DocumentTransitionWrapper: React.FC<DocumentTransitionWrapperProps> = ({
  documentId,
  animation,
  config,
  children,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current || !animation.isAnimating) {
      return;
    }

    const element = elementRef.current;
    const keyframes: Keyframe[] = [
      {
        transform: `translate(${animation.fromPosition.x}px, ${animation.fromPosition.y}px)`,
        width: `${animation.fromDimensions.width}px`,
        height: `${animation.fromDimensions.height}px`,
        opacity: animation.fromOpacity,
        zIndex: animation.fromZIndex,
      },
      {
        transform: `translate(${animation.toPosition.x}px, ${animation.toPosition.y}px)`,
        width: `${animation.toDimensions.width}px`,
        height: `${animation.toDimensions.height}px`,
        opacity: animation.toOpacity,
        zIndex: animation.toZIndex,
      },
    ];

    const animationOptions: KeyframeAnimationOptions = {
      duration: config.duration,
      easing: config.easing,
      delay: animation.delay,
      fill: 'forwards',
    };

    const webAnimation = element.animate(keyframes, animationOptions);

    return () => {
      webAnimation.cancel();
    };
  }, [animation, config]);

  return (
    <div
      ref={elementRef}
      data-testid={`document-transition-${documentId}`}
      className="document-transition-wrapper"
    >
      {children}
    </div>
  );
};

/**
 * CSS classes for layout transition states
 */
export const LAYOUT_TRANSITION_CLASSES = {
  // Container states
  container: {
    base: 'layout-transition-container',
    transitioning: 'layout-transitioning',
    fromStacked: 'from-stacked',
    fromGrid: 'from-grid',
    fromFreeform: 'from-freeform',
    toStacked: 'to-stacked',
    toGrid: 'to-grid',
    toFreeform: 'to-freeform',
  },

  // Document states
  document: {
    base: 'document-transition-item',
    animating: 'document-animating',
    entering: 'document-entering',
    exiting: 'document-exiting',
    moving: 'document-moving',
    resizing: 'document-resizing',
  },

  // Performance optimizations
  performance: {
    willChange: 'will-change-transform',
    gpuAcceleration: 'transform-gpu',
    containLayout: 'contain-layout',
  },
} as const;

/**
 * Utility function to calculate smooth animation curves
 */
export const createEasingFunction = (type: string): string => {
  const easingFunctions: Record<string, string> = {
    'ease-in-quart': 'cubic-bezier(0.5, 0, 0.75, 0)',
    'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
    'ease-in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
    'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'ease-in-back': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };

  return easingFunctions[type] || type;
};

/**
 * Performance monitoring for transitions
 */
export const useTransitionPerformance = () => {
  const [metrics, setMetrics] = useState<{
    averageFrameTime: number;
    droppedFrames: number;
    transitionCount: number;
  }>({
    averageFrameTime: 0,
    droppedFrames: 0,
    transitionCount: 0,
  });

  const measureTransition = useCallback((callback: () => void) => {
    const startTime = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;

    const measureFrame = () => {
      const frameTime = performance.now() - startTime;
      frameCount++;
      totalFrameTime += frameTime;

      // Check if frame took longer than 16ms (60fps threshold)
      if (frameTime > 16) {
        setMetrics(prev => ({
          ...prev,
          droppedFrames: prev.droppedFrames + 1,
        }));
      }

      if (frameCount < 100) { // Measure for 100 frames
        requestAnimationFrame(measureFrame);
      } else {
        setMetrics(prev => ({
          ...prev,
          averageFrameTime: totalFrameTime / frameCount,
          transitionCount: prev.transitionCount + 1,
        }));
      }
    };

    requestAnimationFrame(measureFrame);
    callback();
  }, []);

  return { metrics, measureTransition };
};

export default LayoutTransitionManager;