(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart: EdTech Market Size ---
  var chartMarket = echarts.init(document.getElementById('chart-market'), null, { renderer: 'svg' });
  chartMarket.setOption({
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink, fontSize: 13 }
    },
    grid: { left: 60, right: 30, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: ['2024', '2025', '2026', '2027', '2028'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 12 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '十亿美元',
      nameTextStyle: { color: muted, fontSize: 12 },
      axisLine: { show: false },
      axisLabel: { color: muted, fontSize: 12 },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    series: [
      {
        name: '全球EdTech市场规模',
        type: 'bar',
        barWidth: '45%',
        data: [
          { value: 340, itemStyle: { color: accent + '40' } },
          { value: 405, itemStyle: { color: accent + '60' } },
          { value: 480, itemStyle: { color: accent + '80' } },
          { value: 560, itemStyle: { color: accent } },
          { value: 650, itemStyle: { color: accent } }
        ],
        label: {
          show: true,
          position: 'top',
          color: ink,
          fontSize: 12,
          fontWeight: 600,
          formatter: function(p) { return '$' + p.value + 'B'; }
        }
      },
      {
        name: 'AI学习工具占比',
        type: 'line',
        data: [18, 25, 34, 45, 55],
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: accent2, width: 3 },
        itemStyle: { color: accent2 },
        label: {
          show: true,
          position: 'top',
          color: accent2,
          fontSize: 11,
          formatter: function(p) { return p.value + '%'; }
        },
        yAxisIndex: 0
      }
    ]
  });
  window.addEventListener('resize', function() { chartMarket.resize(); });
})();
