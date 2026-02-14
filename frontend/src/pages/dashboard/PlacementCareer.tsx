import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Target,
  Map,
  Briefcase,
  ExternalLink,
} from "lucide-react";

const prediction = {
  probability: 78,
  status: "High",
  confidence: 92,
  factors: [
    { name: "CGPA (8.5)", impact: "positive", contribution: 25 },
    { name: "Technical Skills", impact: "positive", contribution: 20 },
    { name: "Project Experience", impact: "positive", contribution: 18 },
    { name: "Internship", impact: "positive", contribution: 15 },
    { name: "Communication Skills", impact: "neutral", contribution: 10 },
    { name: "Extracurriculars", impact: "negative", contribution: -5 },
  ],
};

const careerPaths = [
  {
    role: "Software Engineer",
    match: 92,
    demand: "High",
    avgSalary: "₹8-15 LPA",
    skills: ["React", "Node.js", "System Design"],
    roadmap: ["Master DSA", "Build Projects", "System Design", "Interview Prep"],
  },
  {
    role: "Data Scientist",
    match: 78,
    demand: "Very High",
    avgSalary: "₹10-20 LPA",
    skills: ["Python", "ML", "Statistics"],
    roadmap: ["Learn Python", "Statistics", "ML Algorithms", "Deep Learning"],
  },
  {
    role: "Product Manager",
    match: 65,
    demand: "High",
    avgSalary: "₹12-25 LPA",
    skills: ["Analytics", "Communication", "Strategy"],
    roadmap: ["Business Analytics", "User Research", "Product Strategy", "Stakeholder Mgmt"],
  },
];

import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const PlacementCareer = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(() => 'prediction');

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab === 'prediction' || tab === 'career') setActiveTab(tab);
    } catch (e) {
      // ignore
    }
  }, [location.search]);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "High":
        return "text-primary bg-primary/10";
      case "Medium":
        return "text-accent bg-accent/10";
      case "Low":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case "negative":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout title="Placement & Career">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="prediction" className="gap-2">
            <Target size={16} />
            Placement Prediction
          </TabsTrigger>
          <TabsTrigger value="career" className="gap-2">
            <Map size={16} />
            Career Path
          </TabsTrigger>
        </TabsList>

        {/* Placement Prediction Tab */}
        <TabsContent value="prediction" className="space-y-6">
          {/* Main Prediction */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-teal/10 p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Probability Circle */}
                <div className="relative w-48 h-48">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      className="fill-none stroke-card"
                      strokeWidth="16"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      className="fill-none stroke-primary"
                      strokeWidth="16"
                      strokeDasharray={`${(prediction.probability / 100) * 553} 553`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-foreground">{prediction.probability}%</span>
                    <span className="text-sm text-muted-foreground">Probability</span>
                  </div>
                </div>

                {/* Status & Confidence */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold mb-4">Placement Prediction</h2>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(prediction.status)}`}>
                      {prediction.status} Chance
                    </div>
                    <div className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {prediction.confidence}% Confidence
                    </div>
                  </div>
                  <p className="mt-4 text-muted-foreground max-w-md">
                    Based on your profile, academic performance, and skills, you have a high chance of getting placed.
                    Keep improving!
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Influencing Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="text-primary" />
                Factors Influencing Your Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prediction.factors.map((factor) => (
                  <div key={factor.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getImpactIcon(factor.impact)}
                        <span className="font-medium">{factor.name}</span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          factor.contribution >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {factor.contribution > 0 ? "+" : ""}
                        {factor.contribution}%
                      </span>
                    </div>
                    <Progress
                      value={Math.abs(factor.contribution) * 4}
                      className={`h-2 ${factor.contribution < 0 ? "[&>div]:bg-destructive" : ""}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations to Improve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Participate in more extracurricular activities",
                  "Work on communication skills through mock interviews",
                  "Add more projects to your portfolio",
                  "Consider getting AWS/Azure certification",
                ].map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Career Path Tab */}
        <TabsContent value="career" className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-teal/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Map className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">Your Career Roadmap</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Based on your skills, interests, and academic background, here are personalized career recommendations
              with detailed roadmaps.
            </p>
          </div>

          {/* Career Cards */}
          <div className="grid gap-6">
            {careerPaths.map((path) => (
              <Card key={path.role} className="overflow-hidden hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col lg:flex-row">
                  {/* Left - Info */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-5 h-5 text-primary" />
                          <h3 className="text-xl font-bold">{path.role}</h3>
                        </div>
                        <p className="text-muted-foreground">Average Salary: {path.avgSalary}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">{path.match}%</div>
                        <div className="text-sm text-muted-foreground">Match</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Industry Demand: {path.demand}</span>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {path.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button variant="outline" className="gap-2">
                      Explore Resources <ExternalLink size={16} />
                    </Button>
                  </div>

                  {/* Right - Roadmap */}
                  <div className="lg:w-80 bg-secondary/30 p-6 border-t lg:border-t-0 lg:border-l border-border">
                    <h4 className="font-semibold mb-4">Career Roadmap</h4>
                    <div className="space-y-3">
                      {path.roadmap.map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PlacementCareer;
