
Number.prototype.toSizeString = function() {
	if (this < 1000)
		return this + " bytes";
	if (this >= 1000 && this < 1000000)
		return (this / 1000).toFixed(2) + " kilobytes";
	if (this >= 1000000 && this < 1000000000)
		return (this / 1000000).toFixed(2) + " megabytes";
};