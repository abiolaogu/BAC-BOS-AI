'use client';

import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  AccountBalance as AccountBalanceIcon,
  ShoppingCart as ShoppingCartIcon,
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Support as SupportIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

export default function Home() {
  const modules = [
    {
      name: 'CRM',
      description: 'Contact, Lead, and Opportunity Management',
      icon: <PeopleIcon fontSize="large" />,
      color: '#1976d2',
      route: '/crm',
    },
    {
      name: 'ERP / Finance',
      description: 'GL, AP, AR, Cash Flow Management',
      icon: <AccountBalanceIcon fontSize="large" />,
      color: '#2e7d32',
      route: '/erp',
    },
    {
      name: 'eCommerce',
      description: 'Products, Orders, Payments',
      icon: <ShoppingCartIcon fontSize="large" />,
      color: '#ed6c02',
      route: '/ecommerce',
    },
    {
      name: 'HR Management',
      description: 'Employees, Payroll, Time Tracking',
      icon: <BusinessIcon fontSize="large" />,
      color: '#9c27b0',
      route: '/hr',
    },
    {
      name: 'Marketing',
      description: 'Campaigns, Email, Automation',
      icon: <CampaignIcon fontSize="large" />,
      color: '#d32f2f',
      route: '/marketing',
    },
    {
      name: 'Support',
      description: 'Tickets, Knowledge Base, Live Chat',
      icon: <SupportIcon fontSize="large" />,
      color: '#0288d1',
      route: '/support',
    },
    {
      name: 'Analytics',
      description: 'Reports, Dashboards, BI',
      icon: <AssessmentIcon fontSize="large" />,
      color: '#f57c00',
      route: '/analytics',
    },
    {
      name: 'AI Agents',
      description: 'MCP Orchestrator with 8 AI Agents',
      icon: <DashboardIcon fontSize="large" />,
      color: '#7b1fa2',
      route: '/ai-agents',
    },
  ];

  return (
    <>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BAC Platform - Business Operations Suite
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Welcome to BAC Platform
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" paragraph>
            Multi-Tenant Business Operations Platform with AI-Powered Automation
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid item xs={12} sm={6} md={3} key={module.name}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                    transition: 'all 0.3s',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ color: module.color, mb: 2 }}>
                    {module.icon}
                  </Box>
                  <Typography gutterBottom variant="h5" component="h2">
                    {module.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: module.color }}
                  >
                    Open Module
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom>
            Platform Features
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="primary">
                ✓ Multi-Tenant Architecture
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Secure tenant isolation with shared infrastructure
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="primary">
                ✓ AI-Powered Automation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                8 specialized AI agents via MCP Orchestrator
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="primary">
                ✓ Comprehensive Financial Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GL, AP, AR, CFM with AI-powered forecasting
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="primary">
                ✓ Full CRM & Sales Pipeline
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lead management, opportunities, quotes, and forecasting
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
}
