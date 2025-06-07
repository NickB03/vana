import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function Constellation() {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = d3.select(ref.current)
    const width = window.innerWidth
    const height = window.innerHeight
    svg.attr('width', width).attr('height', height)

    const nodes = d3.range(30).map(() => ({ x: Math.random() * width, y: Math.random() * height }))
    const simulation = d3.forceSimulation(nodes as any)
      .velocityDecay(0.1)
      .force('x', d3.forceX(width / 2).strength(0.005))
      .force('y', d3.forceY(height / 2).strength(0.005))
      .force('charge', d3.forceManyBody().strength(-30))
      .force('link', d3.forceLink().distance(80).links(d3.range(nodes.length).map(i => ({ source: i, target: (i + 3) % nodes.length }))))
      .on('tick', () => {
        g.selectAll('circle').attr('cx', d => (d as any).x).attr('cy', d => (d as any).y)
        g.selectAll('line')
          .attr('x1', d => (d as any).source.x)
          .attr('y1', d => (d as any).source.y)
          .attr('x2', d => (d as any).target.x)
          .attr('y2', d => (d as any).target.y)
      })

    const g = svg.append('g')
    g.selectAll('line').data(simulation.force<d3.ForceLink<any, any>>('link')!.links()).enter().append('line').attr('stroke', '#39FF14').attr('stroke-opacity', 0.3)
    g.selectAll('circle').data(nodes).enter().append('circle').attr('r', 3).attr('fill', '#39FF14')

    return () => { simulation.stop(); svg.selectAll('*').remove() }
  }, [])

  return <svg ref={ref} className="absolute top-0 left-0" />
}
