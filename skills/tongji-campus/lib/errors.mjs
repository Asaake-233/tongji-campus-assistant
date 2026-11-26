// 统一错误。内部一律抛 CampusError，CLI 顶层把它转成
// {ok:false,error:{code,message,hint}}；code 给程序判断，message 给人看，
// hint 说下一步该做什么（重登、换参数、还是等一会儿）。
export class CampusError extends Error {
	constructor(code, message, hint = "") {
		super(message || code);
		this.name = "CampusError";
		this.code = code;
		this.hint = hint;
	}
}

export const raise = (code, message, hint = "") => {
	throw new CampusError(code, message, hint);
};
