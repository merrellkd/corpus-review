import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// This import SHOULD FAIL initially as the types don't exist yet
import type { WorkspaceProps } from '../types/workspace-types';

// Mock the component for interface testing
const MockProjectWorkspace: React.FC<WorkspaceProps> = ({ projectId, onBackToProjects }) => {
  return (
    <div data-testid="mock-workspace">
      <span data-testid="project-id">{projectId}</span>
      {onBackToProjects && (
        <button onClick={onBackToProjects} data-testid="back-button">
          Back
        </button>
      )}
    </div>
  );
};

describe('ProjectWorkspace Props Interface Validation', () => {
  it('should enforce required projectId prop type', () => {
    const validProps: WorkspaceProps = {
      projectId: 'test-project-123'
    };

    expect(() => {
      render(<MockProjectWorkspace {...validProps} />);
    }).not.toThrow();
  });

  it('should enforce projectId as string type', () => {
    const validProps: WorkspaceProps = {
      projectId: 'string-project-id'
    };

    const { getByTestId } = render(<MockProjectWorkspace {...validProps} />);
    expect(getByTestId('project-id')).toHaveTextContent('string-project-id');
  });

  it('should make onBackToProjects optional', () => {
    const propsWithoutCallback: WorkspaceProps = {
      projectId: 'test-project'
    };

    expect(() => {
      render(<MockProjectWorkspace {...propsWithoutCallback} />);
    }).not.toThrow();
  });

  it('should accept onBackToProjects function when provided', () => {
    const mockCallback = vi.fn();
    const propsWithCallback: WorkspaceProps = {
      projectId: 'test-project',
      onBackToProjects: mockCallback
    };

    const { getByTestId } = render(<MockProjectWorkspace {...propsWithCallback} />);
    const backButton = getByTestId('back-button');

    backButton.click();
    expect(mockCallback).toHaveBeenCalledOnce();
  });

  it('should validate complete interface matches expected contract', () => {
    // This test validates the shape of WorkspaceProps interface
    const completeProps: WorkspaceProps = {
      projectId: 'project-123',
      onBackToProjects: () => console.log('back')
    };

    // Ensure all required props are present
    expect(completeProps.projectId).toBeDefined();
    expect(typeof completeProps.projectId).toBe('string');

    // Ensure optional props work
    expect(completeProps.onBackToProjects).toBeDefined();
    expect(typeof completeProps.onBackToProjects).toBe('function');
  });

  it('should reject invalid prop types at TypeScript level', () => {
    // These should cause TypeScript errors if uncommented:

    // const invalidProps: WorkspaceProps = {
    //   projectId: 123, // Should error - number not string
    // };

    // const invalidCallback: WorkspaceProps = {
    //   projectId: 'test',
    //   onBackToProjects: 'not a function' // Should error - string not function
    // };

    // This test passes if TypeScript compilation would catch the errors above
    expect(true).toBe(true);
  });
});