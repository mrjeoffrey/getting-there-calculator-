
import React from 'react';
import { Globe } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full glass-panel rounded-2xl p-6 mb-6 animate-slide-down">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-primary/10 rounded-full mr-3">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Getting There Calculator</h1>
            <p className="text-sm text-muted-foreground">Find the best routes to your destination</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
