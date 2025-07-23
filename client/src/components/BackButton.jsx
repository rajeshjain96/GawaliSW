// BackButton.jsx
import React from 'react';

const BackButton = ({ onBack }) => {
  return (
    <button className="btn btn-secondary mb-3" onClick={onBack}>
      &larr; Back to Home
    </button>
  );
};

export default BackButton;