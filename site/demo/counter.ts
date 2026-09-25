import { Component } from 'nemesia'

// #region class
export class Counter extends Component('counter') {
	button = this.ref.button('button')
	value = this.ref.element('value')
	count = this.option.number('initial')

	onMount() {
		this.render()
		this.on(this.button, 'click', () => {
			this.count += 1
			this.render()
		})
	}

	render() {
		this.value.textContent = String(this.count)
	}
}
// #endregion class
