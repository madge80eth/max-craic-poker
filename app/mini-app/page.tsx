'use client'

import React from 'react'
import { Clock, Trophy, Users, ArrowRight } from 'lucide-react'

export default function MiniApp() {
  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4c1d95 0%, #581c87 50%, #7c3aed 100%)',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <img 
          src="/mcp-logo.png" 
          alt="Max Craic Poker" 
          style={{
            width: '80px',
            height: '80px',
            marginBottom: '2rem',
            borderRadius: '12px'
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '0 4px 8px rgba(0,0,0,0.4)'
          }}>
            MAX CRAIC
          </h1>
          <p style={{
            fontSize: '1.5rem',
            color: '#ff6b6b',
            margin: '0 0 1rem 0',
            fontWeight: '600'
          }}>
            POKER
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0',
            fontSize: '1.1rem'
          }}>
            Community-Rewarded Poker
          </p>
        </div>

        {/* Countdown Timer */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Clock size={32} color="white" style={{ marginBottom: '1rem' }} />
          <p style={{
            color: 'white',
            fontSize: '1.1rem',
            margin: '0 0 1rem 0',
            fontWeight: '500'
          }}>
            Next Draw in:
          </p>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'white',
            fontFamily: 'monospace',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)'
          }}>
            12:00:00
          </div>
        </div>

        {/* Tournaments List */}
        <div style={{ width: '100%', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <Trophy size={24} color="white" />
            <h2 style={{
              color: 'white',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: '0'
            }}>
              Today's Tournaments
            </h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                The Bounty Hunter
              </span>
              <span style={{
                color: '#64b5f6',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                $44
              </span>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                Midnight Madness
              </span>
              <span style={{
                color: '#64b5f6',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                $33
              </span>
            </div>
          </div>
        </div>

        {/* Entry Button */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Users size={32} color="white" style={{ marginBottom: '1rem' }} />
          <h3 style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            Community Game
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.95rem',
            margin: '0 0 2rem 0',
            lineHeight: '1.4'
          }}>
            Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
          </p>
          <button
            style={{
              background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
            }}
          >
            Enter the Draw
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}