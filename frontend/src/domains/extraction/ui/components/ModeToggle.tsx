import React from 'react';

type DocumentMode = 'view' | 'edit';

interface ModeToggleProps {
  currentMode: DocumentMode;
  onModeChange: (mode: DocumentMode) => void;
  canEdit: boolean;
  canView: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Toggle component for switching between viewing original and editing extracted documents
 */
export const ModeToggle: React.FC<ModeToggleProps> = ({
  currentMode,
  onModeChange,
  canEdit,
  canView,
  className = '',
  disabled = false
}) => {
  if (!canEdit && !canView) {
    return null;
  }

  // If only one mode is available, show it as a status indicator instead of a toggle
  if (!canEdit || !canView) {
    const availableMode = canEdit ? 'edit' : 'view';
    const isCurrentMode = currentMode === availableMode;

    return (
      <div className={`mode-toggle-single ${className}`}>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
          availableMode === 'edit'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {availableMode === 'edit' ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Editable</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Read-only</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`mode-toggle ${className}`}>
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {/* View Mode Button */}
        <button
          type="button"
          onClick={() => onModeChange('view')}
          disabled={disabled || !canView}
          className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
            currentMode === 'view'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled || !canView ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="View original document (read-only)"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>View</span>
        </button>

        {/* Edit Mode Button */}
        <button
          type="button"
          onClick={() => onModeChange('edit')}
          disabled={disabled || !canEdit}
          className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
            currentMode === 'edit'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled || !canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="Edit extracted document"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Edit</span>
        </button>
      </div>

      {/* Mode description */}
      <div className="mt-2 text-xs text-gray-500">
        {currentMode === 'view' ? (
          <div className="flex items-center space-x-1">
            <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Viewing original document (read-only)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span>Editing extracted content</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ModeStatusProps {
  mode: DocumentMode;
  hasExtraction: boolean;
  isExtracting?: boolean;
  className?: string;
}

/**
 * Status indicator showing current document mode
 */
export const ModeStatus: React.FC<ModeStatusProps> = ({
  mode,
  hasExtraction,
  isExtracting = false,
  className = ''
}) => {
  const getStatusInfo = () => {
    if (isExtracting) {
      return {
        icon: (
          <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ),
        label: 'Extracting...',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700'
      };
    }

    if (mode === 'edit') {
      return {
        icon: (
          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        label: 'Edit Mode',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700'
      };
    }

    return {
      icon: (
        <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      label: 'View Mode',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`mode-status ${className}`}>
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
        {statusInfo.icon}
        <span>{statusInfo.label}</span>
      </div>
    </div>
  );
};