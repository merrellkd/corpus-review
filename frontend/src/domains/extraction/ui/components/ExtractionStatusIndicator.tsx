import React from 'react';
import { ExtractionStatus, ExtractionProgress } from '../../types';

interface ExtractionStatusIndicatorProps {
  status: ExtractionStatus;
  progress?: ExtractionProgress;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Visual indicator for extraction status in file browser and document caddy
 */
export const ExtractionStatusIndicator: React.FC<ExtractionStatusIndicatorProps> = ({
  status,
  progress,
  className = '',
  showLabel = true,
  size = 'md'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-4 w-4';
    }
  };

  const renderStatusContent = () => {
    switch (status) {
      case ExtractionStatus.None:
        return {
          icon: (
            <svg className={`${getIconSize()} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          label: 'Not extracted',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };

      case ExtractionStatus.Pending:
        return {
          icon: (
            <svg className={`${getIconSize()} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Pending',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700'
        };

      case ExtractionStatus.Processing:
        return {
          icon: (
            <svg className={`${getIconSize()} text-blue-500 animate-spin`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          label: progress?.percentage ? `Processing (${progress.percentage}%)` : 'Processing',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700'
        };

      case ExtractionStatus.Completed:
        return {
          icon: (
            <svg className={`${getIconSize()} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Extracted',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700'
        };

      case ExtractionStatus.Error:
        return {
          icon: (
            <svg className={`${getIconSize()} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Error',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700'
        };

      default:
        return {
          icon: (
            <svg className={`${getIconSize()} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };
    }
  };

  const statusContent = renderStatusContent();

  return (
    <div className={`extraction-status-indicator flex items-center space-x-2 ${className}`}>
      <div className={`p-1 rounded-full ${statusContent.bgColor}`}>
        {statusContent.icon}
      </div>

      {showLabel && (
        <span className={`${getSizeClasses()} font-medium ${statusContent.textColor}`}>
          {statusContent.label}
        </span>
      )}

      {/* Error details tooltip */}
      {status === ExtractionStatus.Error && progress?.error && (
        <div className="relative group">
          <svg className="h-3 w-3 text-red-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
            {progress.error}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-800"></div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ExtractButtonProps {
  onExtract: () => void;
  isExtracting?: boolean;
  isDisabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}

/**
 * Button to trigger document extraction
 */
export const ExtractButton: React.FC<ExtractButtonProps> = ({
  onExtract,
  isExtracting = false,
  isDisabled = false,
  className = '',
  size = 'md',
  variant = 'primary'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (isDisabled || isExtracting) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    }

    switch (variant) {
      case 'secondary':
        return 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-4 w-4';
    }
  };

  return (
    <button
      type="button"
      onClick={onExtract}
      disabled={isDisabled || isExtracting}
      className={`extract-button inline-flex items-center space-x-2 ${getSizeClasses()} ${getVariantClasses()} rounded-md font-medium transition-colors duration-200 ${className}`}
    >
      {isExtracting ? (
        <>
          <svg className={`${getIconSize()} animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Extracting...</span>
        </>
      ) : (
        <>
          <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span>Extract</span>
        </>
      )}
    </button>
  );
};