import '../../test/mocks/l10n';
import {
	toL10n,
	simpleClone,
	clamp,
	rowColToIndex,
	indexToRowCol,
	isLandscape,
	isRtl,
	navGrid,
	ellipsisTextContent,
	toggleBluetooth
} from '../util/utils';

describe('<utils> test', () => {
	test('toL10n test', (done) => {
		//1,window.api.l10n.readyState !== 'complete';
		window.api.l10n.readyState = 'loading';
		const value1 = toL10n('header');
		expect(value1).toBe('header');

		//2,window.api.l10n.readyState === 'complete';
		window.api.l10n.readyState = 'complete';
		const value2 = toL10n('title', { attr: 'test' }, false);
		expect(value2).toBe('title');
		done();
	});

	test('simpleClone test', (done) => {
		const obj = {
			name: 'Jim',
			age: '18'
		};
		const value = simpleClone(obj);
		expect(value).toEqual({
			age: '18',
			name: 'Jim'
		});
		done();
	});

	test('clamp test', (done) => {
		const value1 = clamp(10);
		const value2 = clamp(0);
		const value3 = clamp(3, 8, 12);
		expect(value1).toBe(2);
		expect(value2).toBe(0);
		expect(value3).toBe(8);
		done();
	});

	test('rowColToIndex test', (done) => {
		const value1 = rowColToIndex();
		const value2 = rowColToIndex([ 2, 5 ], 1, 9);
		const value3 = rowColToIndex([ 3, 8 ], 2, 8);
		const value4 = rowColToIndex([ 1, 2 ], 3, 12);
		expect(value1).toBe(0);
		expect(value2).toBe(8);
		expect(value3).toBe(6);
		expect(value4).toBe(5);
		done();
	});

	test('indexToRowCol test', (done) => {
		const value1 = indexToRowCol(6);
		const value2 = indexToRowCol(2, 2, 5);

		expect(value1).toEqual([ 2, 0 ]);
		expect(value2).toEqual([ 1, 0 ]);
		done();
	});

	test('isRtl test', (done) => {
		//1, default 'ltr', return false
		expect(isRtl()).toBeFalsy();

		//2, set 'rtl', return true
		document.dir = 'rtl';
		expect(isRtl()).toBeTruthy();
		done();
	});

	test('navGrid test', (done) => {
		const value1 = navGrid();
		expect(value1).toEqual([ 0, 0 ]);

		//1, dir === 'ArrowRight'
		const value2 = navGrid({
			currentRowCol: [ 0, 0 ],
			dir: 'ArrowRight',
			col: 3,
			total: 5
		});
		expect(value2).toEqual([ 0, 1 ]);

		//2, dir === 'ArrowLeft'
		const value3 = navGrid({
			currentRowCol: [ 1, 1 ],
			dir: 'ArrowLeft',
			col: 3,
			total: 10
		});
		expect(value3).toEqual([ 1, 0 ]);

		//3, dir === 'ArrowUp'
		const value4 = navGrid({
			currentRowCol: [ 2, 0 ],
			dir: 'ArrowUp',
			col: 2,
			total: 8
		});
		expect(value4).toEqual([ 1, 0 ]);

		//4, dir === 'ArrowDown'
		const value5 = navGrid({
			currentRowCol: [ 0, 0 ],
			dir: 'ArrowDown',
			col: 3,
			total: 5
		});
		expect(value5).toEqual([ 1, 0 ]);
		done();
	});

	test('toggleBluetooth test', async (done) => {
		if (!navigator.b2g) {
			navigator.b2g = {};
		}
		// 1, no bluetooth exist
		navigator.b2g.bluetooth = {
			defaultAdapter: {}
		};
		await expect(toggleBluetooth()).rejects.toEqual('no bluetooth exist');

		// 2, bluetooth state is busy
		navigator.b2g.bluetooth = {
			defaultAdapter: {
				state: 'scanning'
			}
		};
		await expect(toggleBluetooth()).rejects.toEqual('bluetooth state is busy: scanning');

		// 3, bluetooth exist
		navigator.b2g.bluetooth = {
			defaultAdapter: {
				state: 'enabled',
				connected: () => {
					return Promise.resolve('test');
				}
			}
		};
		await expect(toggleBluetooth('connected')).resolves.toEqual('test');
		done();
	});

	test('ellipsisTextContent test', (done) => {
		const textObj = {
			offsetHeight: 300,
			scrollHeight: 500,
			textContent: 'Hello kaios'
		};
		ellipsisTextContent(textObj);
		expect(textObj.textContent).toBe('ellipses_char');
		done();
	});
});
