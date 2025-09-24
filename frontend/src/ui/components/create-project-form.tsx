/**
 * CreateProjectForm Component
 *
 * Form component for creating new projects with validation, folder selection,
 * and integration with the project store and domain layer.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { CreateProjectParams, ProjectName, FolderPath, ProjectNote } from '../../domains/project';
import { useProjectStore } from '../../stores/project-store';
import { ProjectFolderPicker } from './folder-picker';

// ====================
// Validation Schema
// ====================

const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be 255 characters or less')
    .transform((val) => val.trim()),

  sourceFolder: z.string()
    .min(1, 'Source folder is required')
    .transform((val) => val.trim()),

  note: z.string()
    .max(1000, 'Note must be 1000 characters or less')
    .transform((val) => val?.trim() || undefined)
    .optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

// ====================
// Component Props
// ====================

export interface CreateProjectFormProps {
  /** Whether the form is in a modal/dialog */
  isModal?: boolean;

  /** Initial values for the form */
  initialValues?: Partial<CreateProjectFormData>;

  /** Whether to auto-focus the first field */
  autoFocus?: boolean;

  /** Custom submit button text */
  submitText?: string;

  /** Custom cancel button text */
  cancelText?: string;

  /** Whether to show cancel button */
  showCancel?: boolean;

  /** Event handlers */
  onSubmit?: (project: any) => void; // Would be Project from domain, but avoiding import issues
  onCancel?: () => void;
  onSuccess?: (project: any) => void;
  onError?: (error: string) => void;

  /** Custom styling */
  className?: string;
}

// ====================
// Component
// ====================

export const CreateProjectForm: React.FC<CreateProjectFormProps> = ({
  isModal = false,
  initialValues = {},
  autoFocus = false,
  submitText = 'Create Project',
  cancelText = 'Cancel',
  showCancel = true,
  onSubmit,
  onCancel,
  onSuccess,
  onError,
  className = '',
}) => {
  // ====================
  // Store State
  // ====================

  const createProject = useProjectStore((state) => state.createProject);
  const isCreating = useProjectStore((state) => state.isCreating);
  const error = useProjectStore((state) => state.error);
  const isNameAvailable = useProjectStore((state) => state.isNameAvailable);
  const clearError = useProjectStore((state) => state.clearError);

  // ====================
  // Form State
  // ====================

  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameAvailability, setNameAvailability] = useState<{
    isAvailable: boolean;
    message: string;
    type?: 'success' | 'error' | 'warning';
  } | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
    reset,
    setError,
    clearErrors,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: initialValues.name || '',
      sourceFolder: initialValues.sourceFolder || '',
      note: initialValues.note || '',
    },
    mode: 'onChange',
  });

  const watchedName = watch('name');
  const watchedSourceFolder = watch('sourceFolder');

  // ====================
  // Effects
  // ====================

  // Check name availability when name changes (with debouncing)
  useEffect(() => {
    if (!watchedName || watchedName.length < 2) {
      setNameAvailability(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingName(true);
      try {
        const available = await isNameAvailable(watchedName.trim());
        setNameAvailability({
          isAvailable: available,
          message: available
            ? 'Project name is available'
            : 'A project with this name already exists',
          type: available ? 'success' : 'error',
        });

        if (!available) {
          setError('name', {
            type: 'manual',
            message: 'A project with this name already exists',
          });
        } else {
          clearErrors('name');
        }
      } catch (error) {
        console.warn('Name availability check failed:', error);
        setNameAvailability({
          isAvailable: true,  // Assume available if we can't check
          message: 'Could not verify name - you may proceed',
          type: 'warning',
        });
        // Clear any existing form validation errors for the name field
        clearErrors('name');
      } finally {
        setIsCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedName, isNameAvailable, setError, clearErrors]);

  // Clear store error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // ====================
  // Event Handlers
  // ====================

  const handleFormSubmit = async (data: any) => {
    try {
      // Validate domain objects first
      try {
        ProjectName.new(data.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid project name';
        throw new Error(`Project name validation failed: ${message}`);
      }

      try {
        FolderPath.new(data.sourceFolder);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid folder path';
        throw new Error(`Source folder validation failed: ${message}. Please check that the folder exists and is accessible.`);
      }

      if (data.note) {
        try {
          ProjectNote.new(data.note);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid note';
          throw new Error(`Project note validation failed: ${message}`);
        }
      }

      const params: CreateProjectParams = {
        name: data.name,
        sourceFolder: data.sourceFolder,
        note: data.note,
      };

      // Call custom onSubmit if provided
      if (onSubmit) {
        onSubmit(params);
        return;
      }

      // Otherwise, create project via store
      const project = await createProject(params);

      if (project) {
        onSuccess?.(project);

        // Reset form on success
        if (!isModal) {
          reset();
          setNameAvailability(null);
        }
      }
    } catch (error) {
      let errorMessage = 'Failed to create project';

      if (error instanceof Error) {
        // Check for specific error types and provide better messages
        if (error.message.includes('name')) {
          errorMessage = error.message;
        } else if (error.message.includes('folder') || error.message.includes('path')) {
          errorMessage = error.message;
        } else if (error.message.includes('note')) {
          errorMessage = error.message;
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'A project with this name already exists. Please choose a different name.';
        } else if (error.message.includes('database') || error.message.includes('connection')) {
          errorMessage = 'Database error occurred. Please try again or contact support if the issue persists.';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = 'Permission denied. Please check that you have access to the selected folder.';
        } else {
          // Include the original error message for debugging
          errorMessage = `Project creation failed: ${error.message}`;
        }
      }

      console.error('Project creation error:', error);
      onError?.(errorMessage);
    }
  };

  const handleCancel = () => {
    if (!isCreating) {
      reset();
      setNameAvailability(null);
      clearError();
      onCancel?.();
    }
  };

  const handleFolderValidation = useCallback(async (path: string): Promise<string | null> => {
    if (!path.trim()) {
      return 'Source folder is required';
    }

    try {
      FolderPath.new(path);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid folder path';
    }
  }, []);

  // ====================
  // Render Helper Functions
  // ====================

  const renderNameField = () => (
    <div>
      <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
        Project Name <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              id="project-name"
              type="text"
              autoComplete="off"
              autoFocus={autoFocus}
              disabled={isCreating}
              placeholder="Enter a unique project name"
              className={`
                w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'}
                ${isCreating ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
              `}
            />
          )}
        />

        {/* Name availability indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isCheckingName && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          )}
          {nameAvailability && !isCheckingName && (
            <div className={`text-sm ${
              nameAvailability.type === 'success' ? 'text-green-600' :
              nameAvailability.type === 'error' ? 'text-red-600' :
              nameAvailability.type === 'warning' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {nameAvailability.type === 'success' ? '✓' :
               nameAvailability.type === 'error' ? '✗' :
               nameAvailability.type === 'warning' ? '⚠' : '?'}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {errors.name && (
        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
      )}

      {/* Availability message */}
      {nameAvailability && !errors.name && (
        <p className={`mt-1 text-sm ${
          nameAvailability.type === 'success' ? 'text-green-600' :
          nameAvailability.type === 'error' ? 'text-red-600' :
          nameAvailability.type === 'warning' ? 'text-yellow-600' : 'text-gray-600'
        }`}>
          {nameAvailability.message}
        </p>
      )}
    </div>
  );

  const renderSourceFolderField = () => (
    <div>
      <Controller
        name="sourceFolder"
        control={control}
        render={({ field }) => (
          <ProjectFolderPicker
            label="Source Folder"
            value={field.value}
            onChange={field.onChange}
            disabled={isCreating}
            required
            placeholder="Select the project's source folder"
            helpText="Choose a folder containing the documents you want to analyze"
            error={errors.sourceFolder?.message}
            dialogOptions={{
              title: 'Select Project Source Folder',
              defaultPath: watchedSourceFolder,
            }}
          />
        )}
      />
    </div>
  );

  const renderNoteField = () => (
    <div>
      <label htmlFor="project-note" className="block text-sm font-medium text-gray-700 mb-2">
        Note <span className="text-sm text-gray-500">(optional)</span>
      </label>
      <Controller
        name="note"
        control={control}
        render={({ field }) => (
          <textarea
            {...field}
            id="project-note"
            rows={3}
            disabled={isCreating}
            placeholder="Add an optional note or description for this project..."
            className={`
              w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.note ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'}
              ${isCreating ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
            `}
          />
        )}
      />

      {/* Character count */}
      <div className="mt-1 flex justify-between items-center">
        <div>
          {errors.note && (
            <p className="text-sm text-red-600">{errors.note.message}</p>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {watch('note')?.length || 0} / 1000
        </div>
      </div>
    </div>
  );

  const renderFormActions = () => (
    <div className="flex justify-end space-x-3">
      {showCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCreating}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
      )}

      <button
        type="submit"
        disabled={isCreating || !isValid || isCheckingName || Boolean(nameAvailability && !nameAvailability.isAvailable)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        {isCreating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating...
          </>
        ) : (
          submitText
        )}
      </button>
    </div>
  );

  // ====================
  // CSS Classes
  // ====================

  const formClasses = [
    'create-project-form space-y-6',
    isModal ? 'max-w-md' : 'max-w-lg',
    className,
  ].filter(Boolean).join(' ');

  // ====================
  // Render
  // ====================

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={formClasses}>
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <div className="text-red-500 mr-2">
              <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Creation Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      {renderNameField()}
      {renderSourceFolderField()}
      {renderNoteField()}

      {/* Form Actions */}
      {renderFormActions()}

      {/* Help Text */}
      {!isModal && (
        <div className="text-xs text-gray-500 border-t pt-4">
          <p>
            <strong>Tip:</strong> Choose a descriptive name and ensure the source folder contains
            the documents you want to analyze. The folder path will be saved but the actual files
            won't be modified.
          </p>
        </div>
      )}
    </form>
  );
};

// ====================
// Variants
// ====================

/**
 * Modal version of the create project form
 */
export const CreateProjectModal: React.FC<CreateProjectFormProps & {
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <CreateProjectForm
            {...props}
            isModal={true}
            autoFocus={true}
            onCancel={onClose}
            onSuccess={(project) => {
              props.onSuccess?.(project);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ====================
// Default Export
// ====================

export default CreateProjectForm;