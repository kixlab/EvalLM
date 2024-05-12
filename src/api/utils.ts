export const getWinner = (scores: number[]) => {
    return scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : 2;
}

export const computeAgreement = (evaluations: any[]) => {
    const groups: any[][] = [[], [], []]
    evaluations.forEach((entry: any) => {
        var winner = getWinner([entry['assistant_1']['score'], entry['assistant_2']['score']])
        groups[winner].push({
            ...entry,
            'winner': winner
        })
    })
    const agreementPerGroup = groups.map((g) => g.length / evaluations.length);
    const maxAgreement = Math.max(...agreementPerGroup);
    const maxIndices = agreementPerGroup.map((agreement, i) => agreement === maxAgreement ? i : -1).filter((i) => i !== -1);
    var overallWinner = 2;
    if (maxIndices.length === 1) {
        overallWinner = maxIndices[0];
    } else if (maxIndices.length === 2 && 2 in maxIndices) {
        overallWinner = maxIndices[0] !== 2 ? maxIndices[0] : maxIndices[1];
    }
    const highestAgreement = agreementPerGroup[overallWinner];
    return {
        "evaluations": sortEvalData(groups),
        "agreement": highestAgreement
    };
}

export const isEqualCriteria = (name1: string, name2: string) => {
    name1 = name1.trim().toLowerCase()
    name2 = name2.trim().toLowerCase()
    return name1 === name2 ||
        name1.replace(" ", "_") === name2.replace(" ", "_") ||
        name1.replace(" ", "") === name2.replace(" ", "") ||
        name1 + 'ness' === name2 || name2 + 'ness' === name1 ||
        name1 + 'idity' === name2 || name2 + 'idity' === name1;
}

export const sortEvalData = (groupedEvaluations: any[]) => {
    for (const group of groupedEvaluations) {
        group.sort((a: any, b: any) => b['explanation'].length - a['explanation'].length);
        group.sort((a: any, b: any) => Math.abs(a['assistant_1']['score'] - a['assistant_2']['score']) - Math.abs(b['assistant_1']['score'] - b['assistant_2']['score']));
    }
    groupedEvaluations.sort((a, b) => b.length - a.length);
    const sortedEvaluations = [];
    for (const group of groupedEvaluations) {
        sortedEvaluations.push(...group);
    }
    return sortedEvaluations;
}