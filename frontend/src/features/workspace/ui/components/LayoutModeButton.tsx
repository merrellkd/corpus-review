import React from 'react';
import { LayoutModeType } from '../../domain/value-objects/layout-mode';

/**
 * Props for the LayoutModeButton component
 */
export interface LayoutModeButtonProps {
  mode: LayoutModeType;
  isActive: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onClick: (mode: LayoutModeType) => void;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal' | 'pill';
  className?: string;
}

/**
 * Individual layout mode button component
 * Provides visual representation and interaction for a specific layout mode
 */
export const LayoutModeButton: React.FC<LayoutModeButtonProps> = ({
  mode,
  isActive,
  isDisabled = false,
  isLoading = false,
  onClick,
  showIcon = true,
  size = 'medium',
  variant = 'default',
  className = '',
}) => {
  const getModeIcon = (layoutMode: LayoutModeType) => {
    const iconClass = size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4';

    switch (layoutMode) {
      case LayoutModeType.STACKED:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
          </svg>
        );
      case LayoutModeType.GRID:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V3zM3 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM10 3a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V3zM10 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd" />
          </svg>
        );
      case LayoutModeType.FREEFORM:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M4 3a1 1 0 000 2h3.586L2.293 10.293a1 1 0 101.414 1.414L9 6.414V10a1 1 0 102 0V4a1 1 0 00-1-1H4zM16 11a1 1 0 10-2 0v3.586l-5.293-5.293a1 1 0 00-1.414 1.414L12.586 16H9a1 1 0 100 2h7a1 1 0 001-1v-7z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getModeLabel = (layoutMode: LayoutModeType) => {
    switch (layoutMode) {
      case LayoutModeType.STACKED:
        return 'Stacked';
      case LayoutModeType.GRID:
        return 'Grid';
      case LayoutModeType.FREEFORM:
        return 'Freeform';
      default:
        return 'Unknown';
    }
  };

  const getModeDescription = (layoutMode: LayoutModeType) => {
    switch (layoutMode) {
      case LayoutModeType.STACKED:
        return 'Only active document visible';
      case LayoutModeType.GRID:
        return 'Documents arranged in grid';
      case LayoutModeType.FREEFORM:
        return 'Documents positioned freely';
      default:
        return '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-5 py-3 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    const baseClasses = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    switch (variant) {
      case 'minimal':
        if (isDisabled || isLoading) {
          return `${baseClasses} text-gray-400 cursor-not-allowed`;
        }
        if (isActive) {
          return `${baseClasses} text-blue-600 bg-blue-50 border-b-2 border-blue-600 focus:ring-blue-500`;
        }
        return `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:ring-gray-500`;

      case 'pill':
        if (isDisabled || isLoading) {
          return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed rounded-full`;
        }
        if (isActive) {
          return `${baseClasses} bg-blue-600 text-white shadow-sm rounded-full hover:bg-blue-700 focus:ring-blue-500`;
        }
        return `${baseClasses} bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 hover:text-gray-900 focus:ring-gray-500`;

      default: // 'default'
        if (isDisabled || isLoading) {
          return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 rounded-md`;
        }
        if (isActive) {
          return `${baseClasses} bg-blue-600 text-white shadow-sm border border-blue-600 rounded-md hover:bg-blue-700 focus:ring-blue-500`;
        }
        return `${baseClasses} bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-500`;
    }
  };

  const handleClick = () => {
    if (!isDisabled && !isLoading) {
      onClick(mode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled && !isLoading) {
      e.preventDefault();
      onClick(mode);
    }
  };

  const buttonClasses = `${getSizeClasses()} ${getVariantClasses()} ${className}`;
  const modeLabel = getModeLabel(mode);
  const modeDescription = getModeDescription(mode);

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={buttonClasses}
      disabled={isDisabled || isLoading}
      title={`${modeLabel} Layout - ${modeDescription}`}
      aria-label={`Switch to ${modeLabel.toLowerCase()} layout mode`}
      aria-pressed={isActive}
      data-testid={`layout-mode-button-${mode.toLowerCase()}`}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <span className="flex items-center space-x-2">
          {showIcon && getModeIcon(mode)}
          <span>{modeLabel}</span>
          {isActive && variant !== 'minimal' && (
            <span className="sr-only">(current)</span>
          )}
        </span>
      )}
    </button>
  );
};

/**
 * Group of layout mode buttons with consistent styling
 */
export interface LayoutModeButtonGroupProps {
  currentMode: LayoutModeType;
  onModeChange: (mode: LayoutModeType) => void;
  availableModes?: LayoutModeType[];
  isDisabled?: boolean;
  isLoading?: boolean;
  showIcons?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal' | 'pill';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const LayoutModeButtonGroup: React.FC<LayoutModeButtonGroupProps> = ({
  currentMode,
  onModeChange,
  availableModes = [LayoutModeType.STACKED, LayoutModeType.GRID, LayoutModeType.FREEFORM],
  isDisabled = false,
  isLoading = false,
  showIcons = true,
  size = 'medium',
  variant = 'default',
  orientation = 'horizontal',
  className = '',
}) => {
  const containerClasses = orientation === 'vertical'
    ? 'flex flex-col space-y-1'
    : 'flex items-center space-x-1';

  return (
    <div
      className={`layout-mode-button-group ${containerClasses} ${className}`}
      role="group"
      aria-label="Layout mode selection"
    >
      {availableModes.map((mode) => (
        <LayoutModeButton
          key={mode}
          mode={mode}
          isActive={currentMode === mode}
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={onModeChange}
          showIcon={showIcons}
          size={size}
          variant={variant}
        />
      ))}
    </div>
  );
};

export default LayoutModeButton;