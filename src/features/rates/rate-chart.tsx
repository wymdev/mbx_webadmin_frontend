import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePreferences } from '@/stores/preferences'
import type { Rate } from '@/domain/models'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
export default function RateChart({ rate }: { rate: Rate }) {
  const ref = useRef<HTMLDivElement>(null)
  const theme = usePreferences((s) => s.theme)
  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chart.setOption({
      animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      color: ['#3b9771', '#e5b343'],
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        textStyle: { color: theme === 'dark' ? '#98ada0' : '#78847e', fontSize: 10 },
      },
      grid: { top: 15, left: 50, right: 18, bottom: 60 },
      xAxis: {
        type: 'category',
        data: rate.history.map((h) => h.day),
        boundaryGap: false,
        axisLine: { lineStyle: { color: theme === 'dark' ? '#2c3d32' : '#e3e9e5' } },
        axisLabel: { color: '#78847e', fontSize: 9 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: {
          lineStyle: { color: theme === 'dark' ? '#2c3d32' : '#e3e9e5', type: 'dashed' },
        },
        axisLabel: { color: '#78847e', fontSize: 9 },
      },
      series: [
        {
          name: 'Buy',
          type: 'line',
          smooth: true,
          data: rate.history.map((h) => h.buy),
          symbolSize: 5,
          areaStyle: { opacity: 0.06 },
        },
        {
          name: 'Sell',
          type: 'line',
          smooth: true,
          data: rate.history.map((h) => h.sell),
          symbolSize: 5,
        },
      ],
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [rate, theme])
  return (
    <div
      ref={ref}
      style={{ height: 260, width: '100%' }}
      role="img"
      aria-label={`Sample buy and sell history for ${rate.currency} quoted in MMK`}
    />
  )
}
