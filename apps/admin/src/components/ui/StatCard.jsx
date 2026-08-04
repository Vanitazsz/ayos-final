import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from './Card';
import Skeleton from './Skeleton';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, subtitle, isLoading }) => (
  <Card className="animate-fade-in-up">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex flex-col mt-2">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div
              className="text-3xl font-display font-bold text-navy"
              data-testid="stat-card-value"
            >
              {value}
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <span
                className={`flex items-center font-medium mr-2 ${trend === 'up' ? 'text-success' : 'text-danger'}`}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {trendValue}
              </span>
              {subtitle}
            </p>
          </>
        )}
      </div>
    </CardContent>
  </Card>
);

export default StatCard;