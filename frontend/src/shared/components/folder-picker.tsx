/**
 * FolderPicker Component
 *
 * File system folder picker that integrates with Tauri's dialog API
 * for selecting project source folders with validation and preview.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

const getFolderName = (path: string): string => {
  if (!path) {
    return 'Unknown';
  }

  let normalized = path.replace(/\\/g, '/');
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length > 0) {
    return segments[segments.length - 1];
  }

  return normalized || 'Unknown';
};

// ====================
// Types
// ====================

export interface FolderPickerProps {
  /** Current selected folder path */
  value?: string;

  /** Placeholder text for the input */
  placeholder?: string;

  /** Whether the picker is disabled */
  disabled?: boolean;

  /** Whether the field is required */
  required?: boolean;

  /** Label for the picker */
  label?: string;

  /** Help text to display */
  helpText?: string;

  /** Error message */
  error?: string;

  /** Validation function */
  validate?: (path: string) => string | null | Promise<string | null>;

  /** Whether to show folder info/preview */
  showFolderInfo?: boolean;

  /** Dialog options */
  dialogOptions?: {
    title?: string;
    defaultPath?: string;
    multiple?: boolean;
  };

  /** Event handlers */
  onChange?: (path: string) => void;
  onValidate?: (isValid: boolean, error?: string) => void;
  onFolderInfo?: (info: FolderInfo | null) => void;

  /** Custom styling */
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export interface FolderInfo {
  path: string;
  name: string;
  exists: boolean;
  readable: boolean;
  itemCount?: number;
  size?: number;
  lastModified?: Date;
}

// ====================
// Component
// ====================

export const FolderPicker: React.FC<FolderPickerProps> = ({
  value = '',
  placeholder = 'Select a folder...',
  disabled = false,
  required = false,
  label,
  helpText,
  error,
  validate,
  showFolderInfo = true,
  dialogOptions = {},
  onChange,
  onValidate,
  onFolderInfo,
  className = '',
  inputClassName = '',
  buttonClassName = '',
}) => {
  // ====================
  // State
  // ====================

  const [internalValue, setInternalValue] = useState(value);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // ====================
  // Effects
  // ====================

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Validate when value changes
  useEffect(() => {
    if (internalValue && validate) {
      validateFolder(internalValue);
    } else {
      setValidationError(null);
      onValidate?.(true);
    }
  }, [internalValue, validate]);

  // Load folder info when value changes
  useEffect(() => {
    if (internalValue && showFolderInfo) {
      loadFolderInfo(internalValue);
    } else {
      setFolderInfo(null);
      onFolderInfo?.(null);
    }
  }, [internalValue, showFolderInfo]);

  // ====================
  // Folder Validation
  // ====================

  const validateFolder = useCallback(async (path: string) => {
    if (!validate) return;

    setIsValidating(true);
    try {
      const result = await validate(path);
      setValidationError(result);
      onValidate?.(result === null, result || undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setValidationError(errorMessage);
      onValidate?.(false, errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [validate, onValidate]);

  // ====================
  // Folder Info Loading
  // ====================

  const loadFolderInfo = useCallback(async (path: string) => {
    setIsLoadingInfo(true);
    try {
      // In a real implementation, this would call Tauri commands
      // to get folder information. For now, we'll create basic info.
      const info: FolderInfo = {
        path,
        name: getFolderName(path),
        exists: true, // Would check with Tauri file system API
        readable: true, // Would check with Tauri file system API
      };

      setFolderInfo(info);
      onFolderInfo?.(info);
    } catch (error) {
      setFolderInfo(null);
      onFolderInfo?.(null);
    } finally {
      setIsLoadingInfo(false);
    }
  }, [onFolderInfo]);

  // ====================
  // Event Handlers
  // ====================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleBrowseClick = async () => {
    if (disabled) return;

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: dialogOptions.title || 'Select Project Folder',
        defaultPath: dialogOptions.defaultPath || internalValue || undefined,
        ...dialogOptions,
      });

      if (selected && typeof selected === 'string') {
        setInternalValue(selected);
        onChange?.(selected);
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
      // Could show error toast here
    }
  };

  const handleClearClick = () => {
    if (disabled) return;
    setInternalValue('');
    onChange?.('');
  };

  // ====================
  // Computed Properties
  // ====================

  const displayError = error || validationError;
  const isValid = !displayError && !isValidating;
  const hasValue = Boolean(internalValue.trim());

  // ====================
  // CSS Classes
  // ====================

  const containerClasses = [
    'folder-picker',
    className,
  ].filter(Boolean).join(' ');

  const inputGroupClasses = [
    'relative flex items-center',
    displayError ? 'border-red-300' : 'border-gray-300',
    disabled ? 'bg-gray-50' : 'bg-white',
    'border rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500',
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'flex-1 min-w-0 px-3 py-2 text-sm border-none focus:outline-none focus:ring-0',
    disabled ? 'bg-transparent cursor-not-allowed text-gray-500' : 'bg-transparent',
    inputClassName,
  ].filter(Boolean).join(' ');

  const browseButtonClasses = [
    'px-3 py-2 text-sm font-medium border-l border-gray-300',
    disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
    'transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500',
    buttonClassName,
  ].filter(Boolean).join(' ');

  // ====================
  // Render
  // ====================

  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Group */}
      <div className={inputGroupClasses}>
        {/* Path Input */}
        <input
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
          aria-invalid={displayError ? 'true' : 'false'}
          aria-describedby={displayError ? 'folder-picker-error' : helpText ? 'folder-picker-help' : undefined}
        />

        {/* Validation Indicator */}
        {isValidating && (
          <div className="px-2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          </div>
        )}

        {/* Valid Indicator */}
        {isValid && hasValue && !isValidating && (
          <div className="px-2 text-green-500" title="Valid folder path">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Clear Button */}
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClearClick}
            className="px-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear path"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Browse Button */}
        <button
          type="button"
          onClick={handleBrowseClick}
          disabled={disabled}
          className={browseButtonClasses}
          title="Browse for folder"
        >
          📁 Browse
        </button>
      </div>

      {/* Folder Info */}
      {showFolderInfo && folderInfo && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-2">
                {folderInfo.exists ? (
                  <span className="text-green-600" title="Folder exists">✓</span>
                ) : (
                  <span className="text-red-600" title="Folder not found">⚠️</span>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">{folderInfo.name}</div>
                <div className="text-gray-600 text-xs truncate max-w-xs" title={folderInfo.path}>
                  {folderInfo.path}
                </div>
              </div>
            </div>

            {isLoadingInfo && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            )}
          </div>

          {/* Additional Info */}
          {(folderInfo.itemCount !== undefined || folderInfo.size !== undefined) && (
            <div className="mt-2 text-xs text-gray-500 space-x-4">
              {folderInfo.itemCount !== undefined && (
                <span>{folderInfo.itemCount} items</span>
              )}
              {folderInfo.size !== undefined && (
                <span>{formatBytes(folderInfo.size)}</span>
              )}
              {folderInfo.lastModified && (
                <span>Modified {folderInfo.lastModified.toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <p id="folder-picker-error" className="mt-2 text-sm text-red-600">
          {displayError}
        </p>
      )}

      {/* Help Text */}
      {helpText && !displayError && (
        <p id="folder-picker-help" className="mt-2 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

// ====================
// Utility Functions
// ====================

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ====================
// Variants
// ====================

/**
 * Simple folder picker without folder info display
 */
export const SimpleFolderPicker: React.FC<Omit<FolderPickerProps, 'showFolderInfo'>> = (props) => {
  return <FolderPicker {...props} showFolderInfo={false} />;
};

/**
 * Folder picker with built-in validation for project folders
 */
export const ProjectFolderPicker: React.FC<Omit<FolderPickerProps, 'validate'>> = (props) => {
  const validateProjectFolder = useCallback(async (path: string): Promise<string | null> => {
    if (!path.trim()) {
      return 'Folder path is required';
    }

    return null;
  }, []);

  return (
    <FolderPicker
      {...props}
      validate={validateProjectFolder}
      helpText={props.helpText || 'Select a folder to use as the project source directory'}
    />
  );
};

// ====================
// Default Export
// ====================

export default FolderPicker;
