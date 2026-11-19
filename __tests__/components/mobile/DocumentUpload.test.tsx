import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

const DocumentUpload = (await import('@/components/mobile/DocumentUpload')).default;

describe('DocumentUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(React.createElement(DocumentUpload, { onUpload: jest.fn() }));
  });

  it('renders upload label', () => {
    render(React.createElement(DocumentUpload, { onUpload: jest.fn() }));
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('renders Choose File button', () => {
    render(React.createElement(DocumentUpload, { onUpload: jest.fn() }));
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(React.createElement(DocumentUpload, { label: 'Upload License', onUpload: jest.fn() }));
    expect(screen.getByText('Upload License')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(React.createElement(DocumentUpload, { title: 'Driver License', onUpload: jest.fn() }));
    expect(screen.getByLabelText('Driver License')).toBeInTheDocument();
  });

  it('handles file input change', () => {
    const onUpload = jest.fn();
    render(React.createElement(DocumentUpload, { onUpload }));
    const input = screen.getByLabelText('Select document to upload');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
  });

  it('shows error for invalid file type', () => {
    const onUpload = jest.fn();
    render(React.createElement(DocumentUpload, { 
      onUpload,
      allowedFileTypes: ['.pdf'],
    }));
    const input = screen.getByLabelText('Select document to upload');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText(/Invalid file/i)).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    render(React.createElement(DocumentUpload, { 
      onUpload: jest.fn(),
      className: 'custom-class',
    }));
  });

  it('accepts maxFileSize prop', () => {
    render(React.createElement(DocumentUpload, { 
      onUpload: jest.fn(),
      maxFileSize: 1024,
    }));
  });

  it('accepts accept prop', () => {
    render(React.createElement(DocumentUpload, { 
      onUpload: jest.fn(),
      accept: '.pdf',
    }));
  });
});
