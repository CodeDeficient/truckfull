import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Special } from '@/lib/types';

interface SpecialCardProps {
  special: Special;
}

const SpecialCard: React.FC<SpecialCardProps> = ({ special }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{special.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{special.description}</p>
        {special.valid_until && (
          <p>Valid until: {new Date(special.valid_until).toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialCard;
