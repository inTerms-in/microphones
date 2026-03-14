"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Zap, Clock } from 'lucide-react';

const stats = [
  { label: 'Active Tasks', value: '12', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Team Members', value: '5', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Completion', value: '84%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Hours', value: '32h', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50' },
];

const Index = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900">Hello, Alex! 👋</h2>
          <p className="text-gray-500 text-sm">You have 3 tasks to complete today.</p>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`${stat.bg} p-2 rounded-xl mb-3`}>
                  <stat.icon className={stat.color} size={20} />
                </div>
                <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Banner */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
          <h3 className="text-lg font-bold mb-2">Upgrade to Pro</h3>
          <p className="text-indigo-100 text-sm mb-4 leading-relaxed">
            Get unlimited storage and advanced collaboration tools.
          </p>
          <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl w-full border-none">
            Learn More
          </Button>
        </div>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-indigo-600 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 bg-white p-3 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-slate-100" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;