import React from 'react';
import { ExtractionStatus, ExtractionDtoUtils } from '../../application/dtos/extraction-dtos';
import './ExtractionStatusIndicator.css';

/**
 * Props for the ExtractionStatusIndicator component
 */
export interface ExtractionStatusIndicatorProps {
  /** Current extraction status */
  status: ExtractionStatus | null;

  /** Progress percentage (0-100) for processing status */
  progressPercentage?: number | null;

  /** Error message for failed extractions */
  errorMessage?: string | null;

  /** Show progress percentage text */
  showProgress?: boolean;

  /** Show tooltip with detailed information */
  showTooltip?: boolean;

  /** Compact mode for file list integration */
  compact?: boolean;

  /** CSS class name for custom styling */
  className?: string;

  /** Click handler for interactive status indicators */
  onClick?: () => void;
}

/**
 * Component for displaying extraction status with visual indicators
 *
 * Provides visual feedback for document extraction states including:
 * - None/null: No extraction attempted
 * - Pending: Queued for extraction
 * - Processing: Currently extracting with optional progress
 * - Completed: Extraction successful
 * - Error: Extraction failed with error details
 */
export const ExtractionStatusIndicator: React.FC<ExtractionStatusIndicatorProps> = ({
  status,
  progressPercentage,
  errorMessage,
  showProgress = true,
  showTooltip = true,
  compact = false,
  className = '',
  onClick
}) => {
  const statusText = ExtractionDtoUtils.getStatusDisplayText(status);
  const statusIcon = ExtractionDtoUtils.getStatusIcon(status);
  const statusCssClass = ExtractionDtoUtils.getStatusCssClass(status);

  // Format progress for display
  const progressText = progressPercentage !== null && progressPercentage !== undefined
    ? ExtractionDtoUtils.formatProgressPercentage(progressPercentage)
    : '';

  // Build tooltip content
  const getTooltipContent = (): string => {
    if (!showTooltip) return '';

    switch (status) {
      case 'None':
      case null:
        return 'Click "Extract" to process this document';
      case 'Pending':
        return 'Document is queued for extraction';
      case 'Processing':
        return progressText
          ? `Processing document... ${progressText}`
          : 'Processing document...';
      case 'Completed':
        return 'Document extraction completed successfully. Click to view or re-extract.';
      case 'Error':
        return errorMessage || 'Extraction failed. Click to retry.';
      default:
        return statusText;
    }
  };

  // Build CSS classes
  const cssClasses = [
    'extraction-status-indicator',
    statusCssClass,
    compact ? 'extraction-status-indicator--compact' : '',
    onClick ? 'extraction-status-indicator--clickable' : '',
    className
  ].filter(Boolean).join(' ');

  // Handle click events
  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  };

  // Render processing with progress
  const renderProcessingStatus = () => {
    if (status !== 'Processing') return null;

    return (
      <div className="extraction-status-indicator__progress">
        {!compact && (
          <div className="extraction-status-indicator__progress-bar">
            <div
              className="extraction-status-indicator__progress-fill"
              style={{ width: `${progressPercentage || 0}%` }}
            />
          </div>
        )}
        {showProgress && progressText && (
          <span className="extraction-status-indicator__progress-text">
            {progressText}
          </span>
        )}
      </div>
    );
  };

  // Render error details
  const renderErrorDetails = () => {
    if (status !== 'Error' || compact) return null;

    return (
      <div className="extraction-status-indicator__error">
        {errorMessage && (
          <span className="extraction-status-indicator__error-message">
            {errorMessage}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={cssClasses}
      title={getTooltipContent()}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={`Extraction status: ${statusText}`}
    >
      <div className="extraction-status-indicator__main">
        <span
          className="extraction-status-indicator__icon"
          role="img"
          aria-label={statusText}
        >
          {statusIcon}
        </span>

        {!compact && (
          <span className="extraction-status-indicator__text">
            {statusText}
          </span>
        )}

        {status === 'Processing' && compact && progressText && (
          <span className="extraction-status-indicator__progress-text">
            {progressText}
          </span>
        )}
      </div>

      {renderProcessingStatus()}
      {renderErrorDetails()}
    </div>
  );
};

export default ExtractionStatusIndicator;